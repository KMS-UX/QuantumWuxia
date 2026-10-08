import { discloseRumorToPlayer } from './npcDisclosure';
import type {
  ActionResolution,
  ProposedAction,
  SimulationState,
  StateEvent,
} from './types';
import { validateState } from './validateState';
import { qiRecovery } from './wuxiaRules';
import { environmentAt, difficultyModifier, journeyTicks, weatherFatigue } from './environment';
import { isAsleep } from './routine';
import { TRANSIT_LOCATION } from './worldMap';
import { applyDuel, applyMastery, bestCombatArt, duelDifficulty, findTechnique, combatEdge, injuryPenalty, masteryGain, techniqueLocked, type ArtUse } from './combat';
import { syncInjuries } from './wuxia';
import { applyJianghuAction, createDefaultJianghu, tickJianghu } from './jianghu';
import { applyCausalityV3 } from './jianghuCausalityV3';
import { processInformation, advanceCausalChains } from './jianghuInformationV4';
import { advanceCausalityV5 } from './jianghuCausalityV5';
import { normalizeProposedAction, validateProposedAction } from './actionContract';
import { createEventLedger } from './eventLedger';

const DIFFICULTY: Record<ProposedAction['kind'], number> = {
  inspect: 25,
  talk: 35,
  travel: 30,
  stealth: 55,
  attack: 50,
  meditate: 40,
  rest: 20,
  train: 30,
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
  proposedAction: ProposedAction,
  roll: number,
): ActionResolution {
  const issues = validateState(input);
  if (issues.length > 0) {
    throw new Error(`Invalid simulation state: ${issues.map(i => `${i.path}: ${i.message}`).join('; ')}`);
  }
  if (!Number.isInteger(roll) || roll < 0 || roll > 99) {
    throw new RangeError('roll must be an integer between 0 and 99.');
  }

  const normalizedAction = normalizeProposedAction(input, proposedAction);
  // An unknown travel destination is a legal-but-blocked action (handled below),
  // not a malformed proposal; every other contract issue is still rejected.
  const actionIssues = validateProposedAction(input, normalizedAction).filter(
    issue => !(normalizedAction.kind === 'travel' && issue.path === 'destinationId'),
  );
  if (actionIssues.length > 0) {
    throw new Error(`Invalid proposed action: ${actionIssues.map(i => `${i.path}: ${i.message}`).join('; ')}`);
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
    ledger: input.ledger.map(entry => ({
      ...entry,
      targetIds: [...entry.targetIds],
      causes: [...entry.causes],
      effects: [...entry.effects],
      witnesses: [...entry.witnesses],
      knowledgeConsequences: [...entry.knowledgeConsequences],
      causalLinks: [...entry.causalLinks],
      payload: { ...entry.payload },
    })),
  };
  const events: StateEvent[] = [];
  const ledgerFor = (status: ActionResolution['status'], resolutionEvents: StateEvent[] = events) =>
    createEventLedger(state, normalizedAction, resolutionEvents, {
      status,
      roll,
      difficulty: DIFFICULTY[normalizedAction.kind],
    });
  const persistLedger = (
    status: ActionResolution['status'],
    resolutionEvents: StateEvent[] = events,
  ) => {
    const entries = ledgerFor(status, resolutionEvents);
    state.ledger.push(...entries);
    return entries;
  };
  const c = state.character;
  // A named technique costs its Qi; plain strikes, talk and travel cost none.
  const named: ArtUse | undefined = findTechnique(c, normalizedAction.techniqueId);
  const qiCost = normalizedAction.qiCost ?? named?.technique?.qiCost ?? 0;
  // How long it takes, in ticks (one tick = four hours). Travel follows the map and the weather;
  // an explicit `timeCost` (for example "rest until dawn") overrides the default for everything else.
  const journey = normalizedAction.kind === 'travel' && normalizedAction.destinationId
    ? journeyTicks(state, c.locationId, normalizedAction.destinationId)
    : undefined;
  const timeCost = normalizedAction.kind === 'travel' && journey
    ? Math.max(1, journey.ticks)
    : Math.max(1, Math.min(24, Math.round(normalizedAction.timeCost ?? (normalizedAction.kind === 'rest' || normalizedAction.kind === 'train' ? 2 : 1))));
  const env = environmentAt(state, c.locationId);
  const blockedNow = (summary: string, difficulty: number): ActionResolution => ({
    status: 'blocked', summary, action: normalizedAction, state,
    events: [{ type: 'action.resolved', payload: { kind: normalizedAction.kind, status: 'blocked' } }],
    ledger: persistLedger('blocked', [{ type: 'action.resolved', payload: { kind: normalizedAction.kind, status: 'blocked' } }]),
    roll, difficulty,
  });

  if (normalizedAction.kind === 'travel' && normalizedAction.destinationId && state.world.map && !journey) {
    return blockedNow('There is no road from here to there.', DIFFICULTY.travel);
  }
  const talkTarget = normalizedAction.kind === 'talk' && normalizedAction.targetId
    ? state.jianghu?.npcs.find(n => n.id === normalizedAction.targetId)
    : undefined;
  if (talkTarget && talkTarget.alive && talkTarget.locationId === c.locationId && env.calendar && isAsleep(talkTarget, env.time.phase)) {
    return blockedNow(`${talkTarget.name} is asleep.`, DIFFICULTY.talk);
  }
  if (talkTarget && talkTarget.alive && talkTarget.locationId !== c.locationId) {
    return blockedNow(`${talkTarget.name} is not here.`, DIFFICULTY.talk);
  }

  const duelTarget = normalizedAction.kind === 'attack' && normalizedAction.targetId
    ? state.jianghu?.npcs.find(n => n.id === normalizedAction.targetId)
    : undefined;
  if (duelTarget && (!duelTarget.alive || duelTarget.locationId !== c.locationId)) {
    return blockedNow('No one by that name is here to fight.', DIFFICULTY.attack);
  }
  const practiceUse: ArtUse | undefined = normalizedAction.kind === 'train'
    ? (named ?? (bestCombatArt(c) ? { art: bestCombatArt(c)! } : c.wuxia?.martialArts[0] ? { art: c.wuxia.martialArts[0] } : undefined))
    : undefined;
  if (normalizedAction.kind === 'train' && !practiceUse) return blockedNow('You know no martial art to practise.', DIFFICULTY.train);
  if (named?.technique && techniqueLocked(named.art, named.technique)) {
    return blockedNow(`You have not yet mastered ${named.technique.name}; it needs ${named.technique.minMastery} mastery of ${named.art.name}.`, DIFFICULTY[normalizedAction.kind]);
  }

  if (normalizedAction.kind === 'travel') {
    if (!normalizedAction.destinationId || !state.world.locationIds.includes(normalizedAction.destinationId)) {
      return {
        status: 'blocked',
        summary: 'The destination is unknown or unreachable from the current world map.',
        action: normalizedAction,
        state,
        events: [{ type: 'action.resolved', payload: { kind: normalizedAction.kind, status: 'blocked' } }],
        ledger: persistLedger('blocked', [{ type: 'action.resolved', payload: { kind: normalizedAction.kind, status: 'blocked' } }]),
        roll,
        difficulty: DIFFICULTY.travel,
      };
    }
  }
  if (qiCost > c.qi) {
    return {
      status: 'blocked',
      summary: 'There is not enough Qi to attempt this action safely.',
      action: normalizedAction,
      state,
      events: [{ type: 'action.resolved', payload: { kind: normalizedAction.kind, status: 'blocked' } }],
      ledger: persistLedger('blocked', [{ type: 'action.resolved', payload: { kind: normalizedAction.kind, status: 'blocked' } }]),
      roll,
      difficulty: DIFFICULTY[normalizedAction.kind],
    };
  }

  const attackUse: ArtUse | undefined = named ?? (normalizedAction.kind === 'attack' && bestCombatArt(c) ? { art: bestCombatArt(c)! } : undefined);
  let difficulty = clamp(DIFFICULTY[normalizedAction.kind] + RISK_MODIFIER[normalizedAction.riskPosture ?? normalizedAction.risk] - Math.floor(c.attributes.luck / 5), 5, 95)
    + injuryPenalty(c, normalizedAction.kind)
    + difficultyModifier(normalizedAction.kind, env);
  let score = roll + Math.floor((c.attributes.perception + c.attributes.agility) / 4);
  if (duelTarget) {
    difficulty = duelDifficulty(duelTarget, normalizedAction.riskPosture ?? normalizedAction.risk, c.attributes.luck);
    score = roll + combatEdge(c, attackUse, duelTarget);
  }
  let status: ActionResolution['status'];
  let travelFrom: string | undefined;
  let travelTo: string | undefined;

  if (normalizedAction.kind === 'rest') {
    status = 'success';
    c.fatigue = clamp(c.fatigue - 12 * timeCost, 0, 100);
    const restoredHp = Math.min(c.maxHp - c.hp, Math.max(1, Math.ceil(c.maxHp * 0.025 * timeCost)));
    c.hp += restoredHp;
    events.push({ type: 'character.hp_changed', causes: ['action:rest'], payload: { amount: restoredHp, reason: 'rest' } });
    events.push({ type: 'character.fatigue_changed', causes: ['action:rest'], payload: { value: c.fatigue } });
    // Rest is how wounds close faster (Bible section 7): it doubles the healing the passing time already gives.
    if (c.wuxia) c.wuxia.injuries = c.wuxia.injuries.map(i => ({ ...i, healingTurns: Math.max(1, i.healingTurns - timeCost) }));
  } else if (normalizedAction.kind === 'meditate') {
    status = 'success';
    const restoredQi = Math.min(
      c.maxQi - c.qi,
      c.wuxia ? qiRecovery(c as typeof c & { wuxia: NonNullable<typeof c.wuxia> }, Math.max(1, Math.floor(c.maxQi * 0.15 * timeCost))) : Math.max(1, Math.floor(c.maxQi * 0.15 * timeCost)),
    );
    c.qi += restoredQi;
    if (c.wuxia) {
      c.wuxia.cultivation.accumulatedInsight += 1;
      c.wuxia.cultivation.qiControl = clamp(c.wuxia.cultivation.qiControl + 1, 0, 100);
    }
    c.fatigue = clamp(c.fatigue + 5, 0, 100);
    events.push({ type: 'character.qi_changed', causes: ['action:meditate'], knowledgeConsequences: ['player:qi-recovered'], payload: { amount: restoredQi, reason: 'meditation' } });
    events.push({ type: 'character.fatigue_changed', payload: { value: c.fatigue } });
  } else if (score >= difficulty + 20) {
    status = 'success';
  } else if (score >= difficulty) {
    status = 'partial';
  } else {
    status = 'failure';
  }

  if (status === 'failure' && normalizedAction.kind === 'attack' && normalizedAction.risk === 'high' && c.wuxia && !duelTarget) {
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
      causes: ['action:attack', 'resolution:failure', 'risk:high'],
      payload: { id: injury.id, severity: injury.severity, bodyRegion: injury.bodyRegion },
    });
  }

  if (status === 'success' && normalizedAction.kind === 'talk' && c.wuxia) {
    c.wuxia.social.trust = clamp(c.wuxia.social.trust + 1, -100, 100);
    c.wuxia.social.face = clamp(c.wuxia.social.face + 1, 0, 100);
    events.push({
      type: 'character.social_changed',
      causes: ['action:talk', 'resolution:success'],
      witnesses: [normalizedAction.targetId ?? c.id],
      payload: { trust: c.wuxia.social.trust, face: c.wuxia.social.face },
    });
  }

  if (duelTarget && state.jianghu && (status === 'success' || status === 'partial' || status === 'failure')) {
    // Qi is spent first so a defeat reads the post-exchange state.
    c.qi -= qiCost;
    applyDuel({ state, c, opponent: duelTarget, status, roll, score, difficulty, use: attackUse, action: normalizedAction, qiSpent: qiCost }, events);
    if (qiCost > 0) events.push({ type: 'character.qi_changed', causes: ['action:attack', 'resource:qi'], payload: { amount: -qiCost, reason: 'technique' } });
  } else if (normalizedAction.kind === 'train' && practiceUse) {
    c.qi -= qiCost;
    if (qiCost > 0) events.push({ type: 'character.qi_changed', causes: ['action:train', 'resource:qi'], payload: { amount: -qiCost, reason: 'practice' } });
    applyMastery(c, practiceUse, masteryGain(status, practiceUse.art.mastery, true), events);
  }

  if (normalizedAction.kind !== 'rest' && normalizedAction.kind !== 'meditate') {
    if (!duelTarget && normalizedAction.kind !== 'train') c.qi -= qiCost;
    if (qiCost > 0 && !duelTarget && normalizedAction.kind !== 'train') events.push({ type: 'character.qi_changed', causes: [`action:${normalizedAction.kind}`, 'resource:qi'], payload: { amount: -qiCost, reason: normalizedAction.kind } });
    if (status === 'success' && normalizedAction.kind === 'travel' && normalizedAction.destinationId) {
      // The player is on the road for the whole journey (see the tick loop below) and arrives on its last tick.
      travelFrom = c.locationId;
      travelTo = normalizedAction.destinationId;
    }
    if (status === 'success' && normalizedAction.kind === 'inspect' && normalizedAction.targetId) {
      const fact = `inspected:${normalizedAction.targetId}`;
      if (!state.world.knownFacts.includes(fact)) {
        state.world.knownFacts.push(fact);
        events.push({ type: 'world.fact_discovered', causes: ['action:inspect', `target:${normalizedAction.targetId}`], witnesses: [c.id], knowledgeConsequences: [`player:fact:${fact}`], payload: { fact } });
      }
    }
    // Effort per tick (travel is steadier than a fight), plus whatever the weather adds outdoors.
    const spent = travelTo ? timeCost : (normalizedAction.kind === 'travel' ? 1 : timeCost);
    const perTick = normalizedAction.kind === 'travel' ? (normalizedAction.risk === 'high' ? 6 : 3) : (normalizedAction.risk === 'high' ? 8 : 4);
    const outdoors = normalizedAction.kind === 'travel' ? { ...env, indoors: false } : env;
    c.fatigue = clamp(c.fatigue + Math.ceil(spent * perTick) + spent * weatherFatigue(outdoors), 0, 100);
    events.push({ type: 'character.fatigue_changed', payload: { value: c.fatigue } });
  }

  // Time that actually passes: a successful journey takes its full length; a failed attempt costs one tick.
  const elapsed = normalizedAction.kind === 'travel' && !travelTo ? 1 : timeCost;

  if (c.wuxia && c.wuxia.injuries.length > 0) {
    c.wuxia.injuries = c.wuxia.injuries
      .map(injury => ({ ...injury, healingTurns: Math.max(0, injury.healingTurns - elapsed) }))
      .filter(injury => injury.healingTurns > 0);
    const synced = syncInjuries(c as typeof c & { wuxia: NonNullable<typeof c.wuxia> });
    c.conditions = synced.conditions;
  }

  if (state.jianghu && status === 'success' && normalizedAction.kind === 'talk' && normalizedAction.targetId) {
    const disclosure = discloseRumorToPlayer(state.jianghu, state, normalizedAction.targetId);
    state.jianghu = disclosure.jianghu;
    events.push(...disclosure.events);
  }

  if (state.jianghu) {
    const interaction = applyJianghuAction(state.jianghu, state, normalizedAction);
    state.jianghu = interaction.jianghu;
    events.push(...interaction.events);
  }

  // The world moves one tick at a time for as long as the action takes, so a three-day journey is
  // three days of rumors, NPC errands and slow-burn events, and nobody "sees" what the traveller misses.
  for (let step = 1; step <= elapsed; step++) {
    state.world.turn += 1;
    if (travelTo) c.locationId = step < elapsed ? TRANSIT_LOCATION : travelTo;
    if (state.jianghu) {
      const ticked = tickJianghu(state.jianghu, state);
      const v3 = applyCausalityV3(ticked.jianghu, state);
      const info = processInformation(v3.jianghu, state);
      const chains = advanceCausalChains(info.jianghu, state);
      const v5 = advanceCausalityV5(chains.jianghu, state);
      state.jianghu = v5.jianghu;
      events.push(...ticked.events, ...v3.events, ...info.events, ...chains.events, ...v5.events);
    }
  }
  if (travelFrom && travelTo) {
    events.push({ type: 'world.location_changed', causes: ['action:travel', `location:${travelFrom}`], witnesses: [c.id], payload: { from: travelFrom, to: travelTo, ticks: elapsed, weather: journey?.weather.kind ?? 'clear', delayed: journey?.delayed ?? false } });
  }

  events.push({
    type: 'action.resolved',
    causes: [`action:${normalizedAction.kind}`, `resolution:${status}`],
    witnesses: [c.id],
    causalLinks: state.ledger.slice(-3).map(entry => entry.eventId),
    payload: { kind: normalizedAction.kind, status, difficulty, roll, score, turn: state.world.turn, ticks: elapsed },
  });

  const summaries: Record<ActionResolution['status'], string> = {
    success: 'The action succeeds; the narrator may now describe the confirmed result.',
    partial: 'The action partly succeeds or succeeds with a complication.',
    failure: 'The attempt fails; the world state remains consistent and may produce consequences.',
    blocked: 'The action cannot be attempted in the current state.',
  };

  const ledger = persistLedger(status);

  const finalIssues = validateState(state);
  if (finalIssues.length > 0) {
    throw new Error(`Resolver produced invalid state: ${finalIssues.map(i => `${i.path}: ${i.message}`).join('; ')}`);
  }

  return {
    status,
    summary: summaries[status],
    action: normalizedAction,
    state,
    events,
    ledger,
    roll,
    difficulty,
  };
}
