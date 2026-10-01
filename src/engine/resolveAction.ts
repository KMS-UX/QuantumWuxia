import type {
  ActionResolution,
  ProposedAction,
  SimulationState,
  StateEvent,
} from './types';
import { validateState } from './validateState';
import { qiRecovery } from './wuxiaRules';
import { syncInjuries } from './wuxia';
import { applyJianghuAction, createDefaultJianghu, tickJianghu } from './jianghu';
import { applyCausalityV3 } from './jianghuCausalityV3';

const DIFFICULTY: Record<ProposedAction['kind'], number> = {
  inspect: 25,
  talk: 35,
  travel: 30,
  stealth: 55,
  attack: 50,
  meditate: 40,
  rest: 20,
  other: 45,
};

const RISK_MODIFIER: Record<ProposedAction['risk'], number> = {
  low: -10,
  medium: 0,
  high: 10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Resolve an action without mutating input state or calling an AI model.
 * `roll` is injected so tests and replays can be deterministic (valid range 0..99).
 * Caller must validate/interpret natural language before constructing ProposedAction.
 */
export function resolveAction(
  input: SimulationState,
  action: ProposedAction,
  roll: number,
): ActionResolution {
  const issues = validateState(input);
  if (issues.length > 0) {
    throw new Error(`Invalid simulation state: ${issues.map(i => `${i.path}: ${i.message}`).join('; ')}`);
  }
  if (!Number.isInteger(roll) || roll < 0 || roll > 99) {
    throw new RangeError('roll must be an integer between 0 and 99.');
  }
  if (!action.description.trim()) throw new Error('Action description must not be empty.');
  if (action.qiCost !== undefined && (!Number.isFinite(action.qiCost) || action.qiCost < 0)) {
    throw new Error('qiCost must be a finite non-negative number.');
  }
  if (action.timeCost !== undefined && (!Number.isFinite(action.timeCost) || action.timeCost < 0)) {
    throw new Error('timeCost must be a finite non-negative number.');
  }

  const state: SimulationState = {
    ...input,
    character: {
      ...input.character,
      attributes: { ...input.character.attributes },
      conditions: input.character.conditions.map(condition => ({ ...condition })),
      inventory: [...input.character.inventory],
      ...(input.character.wuxia ? {
        wuxia: {
          ...input.character.wuxia,
          cultivation: { ...input.character.wuxia.cultivation },
          martialArts: input.character.wuxia.martialArts.map(art => ({
            ...art,
            techniques: art.techniques.map(technique => ({ ...technique })),
          })),
          injuries: input.character.wuxia.injuries.map(injury => ({ ...injury })),
          social: { ...input.character.wuxia.social },
        },
      } : {}),
    },
    world: {
      ...input.world,
      locationIds: [...input.world.locationIds],
      knownFacts: [...input.world.knownFacts],
      knownRumorIds: [...(input.world.knownRumorIds ?? [])],
      knownNpcIds: [...(input.world.knownNpcIds ?? [])],
    },
    jianghu: input.jianghu ? JSON.parse(JSON.stringify(input.jianghu)) : createDefaultJianghu(input.character.locationId),
  };
  const events: StateEvent[] = [];
  const c = state.character;
  const qiCost = action.qiCost ?? (action.kind === 'attack' ? 0 : action.kind === 'meditate' ? 0 : 0);
  const timeCost = action.timeCost ?? (action.kind === 'rest' ? 2 : action.kind === 'travel' ? 2 : 1);

  if (action.kind === 'travel') {
    if (!action.destinationId || !state.world.locationIds.includes(action.destinationId)) {
      return {
        status: 'blocked',
        summary: 'The destination is unknown or unreachable from the current world map.',
        action,
        state,
        events: [{ type: 'action.resolved', payload: { kind: action.kind, status: 'blocked' } }],
        roll,
        difficulty: DIFFICULTY.travel,
      };
    }
  }
  if (qiCost > c.qi) {
    return {
      status: 'blocked',
      summary: 'There is not enough Qi to attempt this action safely.',
      action,
      state,
      events: [{ type: 'action.resolved', payload: { kind: action.kind, status: 'blocked' } }],
      roll,
      difficulty: DIFFICULTY[action.kind],
    };
  }

  const difficulty = clamp(DIFFICULTY[action.kind] + RISK_MODIFIER[action.risk] - Math.floor(c.attributes.luck / 5), 5, 95);
  const score = roll + Math.floor((c.attributes.perception + c.attributes.agility) / 4);
  let status: ActionResolution['status'];

  if (action.kind === 'rest') {
    status = 'success';
    c.fatigue = clamp(c.fatigue - 25, 0, 100);
    const restoredHp = Math.min(c.maxHp - c.hp, Math.max(1, Math.floor(c.maxHp * 0.05)));
    c.hp += restoredHp;
    events.push({ type: 'character.hp_changed', payload: { amount: restoredHp, reason: 'rest' } });
    events.push({ type: 'character.fatigue_changed', payload: { value: c.fatigue } });
  } else if (action.kind === 'meditate') {
    status = 'success';
    const restoredQi = Math.min(
      c.maxQi - c.qi,
      c.wuxia ? qiRecovery(c as typeof c & { wuxia: NonNullable<typeof c.wuxia> }, Math.max(1, Math.floor(c.maxQi * 0.15))) : Math.max(1, Math.floor(c.maxQi * 0.15)),
    );
    c.qi += restoredQi;
    if (c.wuxia) {
      c.wuxia.cultivation.accumulatedInsight += 1;
      c.wuxia.cultivation.qiControl = clamp(c.wuxia.cultivation.qiControl + 1, 0, 100);
    }
    c.fatigue = clamp(c.fatigue + 5, 0, 100);
    events.push({ type: 'character.qi_changed', payload: { amount: restoredQi, reason: 'meditation' } });
    events.push({ type: 'character.fatigue_changed', payload: { value: c.fatigue } });
  } else if (score >= difficulty + 20) {
    status = 'success';
  } else if (score >= difficulty) {
    status = 'partial';
  } else {
    status = 'failure';
  }

  if (status === 'failure' && action.kind === 'attack' && action.risk === 'high' && c.wuxia) {
    const injury = {
      id: `backlash-${state.world.turn + 1}`,
      severity: 1,
      bodyRegion: 'internal' as const,
      healingTurns: 3,
      untreated: true,
    };
    c.wuxia.injuries.push(injury);
    events.push({
      type: 'character.injury_added',
      payload: { id: injury.id, severity: injury.severity, bodyRegion: injury.bodyRegion },
    });
  }

  if (status === 'success' && action.kind === 'talk' && c.wuxia) {
    c.wuxia.social.trust = clamp(c.wuxia.social.trust + 1, -100, 100);
    c.wuxia.social.face = clamp(c.wuxia.social.face + 1, 0, 100);
    events.push({
      type: 'character.social_changed',
      payload: { trust: c.wuxia.social.trust, face: c.wuxia.social.face },
    });
  }

  if (status !== 'blocked' && action.kind !== 'rest' && action.kind !== 'meditate') {
    c.qi -= qiCost;
    if (qiCost > 0) events.push({ type: 'character.qi_changed', payload: { amount: -qiCost, reason: action.kind } });
    if (status === 'success' && action.kind === 'travel' && action.destinationId) {
      const from = c.locationId;
      c.locationId = action.destinationId;
      events.push({ type: 'world.location_changed', payload: { from, to: c.locationId } });
    }
    if (status === 'success' && action.kind === 'inspect' && action.targetId) {
      const fact = `inspected:${action.targetId}`;
      if (!state.world.knownFacts.includes(fact)) {
        state.world.knownFacts.push(fact);
        events.push({ type: 'world.fact_discovered', payload: { fact } });
      }
    }
    c.fatigue = clamp(c.fatigue + Math.ceil(timeCost * (action.risk === 'high' ? 8 : 4)), 0, 100);
    events.push({ type: 'character.fatigue_changed', payload: { value: c.fatigue } });
  }

  if (c.wuxia && c.wuxia.injuries.length > 0) {
    c.wuxia.injuries = c.wuxia.injuries
      .map(injury => ({ ...injury, healingTurns: Math.max(0, injury.healingTurns - 1) }))
      .filter(injury => injury.healingTurns > 0);
    const synced = syncInjuries(c as typeof c & { wuxia: NonNullable<typeof c.wuxia> });
    c.conditions = synced.conditions;
  }

  if (state.jianghu) {
    const interaction = applyJianghuAction(state.jianghu, state, action);
    state.jianghu = interaction.jianghu;
    events.push(...interaction.events);
  }

  state.world.turn += 1;

  if (state.jianghu) {
    const ticked = tickJianghu(state.jianghu, state);
    const v3 = applyCausalityV3(ticked.jianghu, state);
    state.jianghu = v3.jianghu;
    events.push(...ticked.events, ...v3.events);
  }

  events.push({
    type: 'action.resolved',
    payload: { kind: action.kind, status, difficulty, roll, score, turn: state.world.turn },
  });

  const summaries: Record<ActionResolution['status'], string> = {
    success: 'The action succeeds; the narrator may now describe the confirmed result.',
    partial: 'The action partly succeeds or succeeds with a complication.',
    failure: 'The attempt fails; the world state remains consistent and may produce consequences.',
    blocked: 'The action cannot be attempted in the current state.',
  };

  const finalIssues = validateState(state);
  if (finalIssues.length > 0) {
    throw new Error(`Resolver produced invalid state: ${finalIssues.map(i => `${i.path}: ${i.message}`).join('; ')}`);
  }

  return { status, summary: summaries[status], action, state, events, roll, difficulty };
}
