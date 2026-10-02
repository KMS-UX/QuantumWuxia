import { chainPace } from '../engine/jianghu';
import { interpretPlayerAction } from '../engine/actionInterpreter';
import type { ProposedAction, RiskLevel, SimulationState } from '../engine/types';
import type { NarrationChoice } from './validateNarration';

/**
 * Deterministic choice generator (Game Bible sections 12-13): five contextual
 * suggestions drawn from what the player can see and legally do right now. It is
 * the safe fallback when the narrator is unavailable, and it backfills any choice
 * the narrator proposes that the rules could not honour (for example travel to a
 * place that does not exist).
 */
export interface ChoiceContext {
  /** Locations reachable from `locationId`, with travel time in days. */
  neighbours?: (locationId: string) => Array<{ id: string; days: number }>;
  /** Inspectable points of interest at a location. */
  features?: (locationId: string) => string[];
}

export interface ChoiceCandidate extends NarrationChoice { intendedKind: ProposedAction['kind'] }

const CHOICE_COUNT = 5;

/** Ordered, de-duplicated candidates; the first five are the suggestions. Pure. */
export function choiceCandidates(state: SimulationState, ctx: ChoiceContext = {}): ChoiceCandidate[] {
  const here = state.character.locationId;
  const jianghu = state.jianghu;
  const out: ChoiceCandidate[] = [];
  const add = (text: string, risk: RiskLevel, intendedKind: ProposedAction['kind']) => {
    if (!out.some(c => c.text.toLowerCase() === text.toLowerCase())) out.push({ id: 0, text, risk, intendedKind });
  };

  // 1. Something public here is about to come to a head: invite the player to be present for it.
  const imminent = jianghu?.worldEvents.some(w => {
    if (!w.active || !w.finale || w.locationId !== here) return false;
    const chain = jianghu.causalChains?.find(c => c.rootEventId === w.id && c.active);
    if (!chain) return false;
    const pace = chainPace(w);
    const turnsLeft = Math.max(0, chain.nextCheckTurn - state.world.turn) + Math.max(0, pace.steps - chain.step - 1) * pace.interval;
    return turnsLeft <= 10;
  });
  if (imminent) add('Watch and listen closely to see how things unfold here', 'low', 'inspect');

  // 2. People present, those with news the player has not heard first.
  const playerId = state.character.id;
  const present = (jianghu?.npcs ?? []).filter(n => n.alive && n.locationId === here);
  const hasNews = (id: string) => jianghu!.rumors.some(r => r.knownBy.includes(id) && !r.knownBy.includes(playerId));
  const people = [...present].sort((a, b) => Number(hasNews(b.id)) - Number(hasNews(a.id)) || a.id.localeCompare(b.id));
  if (people[0]) add(`Talk to ${people[0].name}`, 'low', 'talk');

  // 3. A feature of the place, rotating with time so repeat visits offer something new.
  const features = ctx.features?.(here) ?? [];
  if (features.length) add(`Inspect the ${features[state.world.turn % features.length]}`, 'low', 'inspect');

  // 4. Somewhere to go: nearest first.
  const roads = (ctx.neighbours?.(here) ?? []).filter(r => state.world.locationIds.includes(r.id)).sort((a, b) => a.days - b.days || a.id.localeCompare(b.id));
  const risk = (days: number): RiskLevel => (days >= 3 ? 'high' : days === 2 ? 'medium' : 'low');
  if (roads[0]) add(`Travel to ${roads[0].id}`, risk(roads[0].days), 'travel');

  // 5. More of the above, then looking after yourself.
  const arts = state.character.wuxia?.martialArts ?? [];
  const rested = state.character.fatigue < 60;
  const trainable = [...arts].sort((a, b) => a.mastery - b.mastery || a.id.localeCompare(b.id))[0];
  if (trainable && trainable.mastery < 100 && rested) add(`Practice the ${trainable.name}`, 'low', 'train');
  const fit = state.character.hp >= state.character.maxHp * 0.6 && rested;
  // A fair bout: someone who fights, but not a healer, and not so far above the player that it is a death wish.
  const sparring = people.find(p => (p.arts?.length ?? 0) > 0 && (p.power ?? 0) >= 30 && (p.power ?? 0) <= 70 && !/healer|physician|abbot/i.test(p.role));
  if (sparring && arts.length && fit) add(`Challenge ${sparring.name} to a friendly duel`, 'medium', 'attack');
  if (people[1]) add(`Talk to ${people[1].name}`, 'low', 'talk');
  if (roads[1]) add(`Travel to ${roads[1].id}`, risk(roads[1].days), 'travel');
  if (features.length > 1) add(`Inspect the ${features[(state.world.turn + 1) % features.length]}`, 'low', 'inspect');
  const worn = state.character.fatigue >= 40 || state.character.hp < state.character.maxHp;
  add(worn ? 'Rest and recover your strength' : 'Meditate quietly to steady your Qi', 'low', worn ? 'rest' : 'meditate');
  add(worn ? 'Meditate quietly to steady your Qi' : 'Rest and recover your strength', 'low', worn ? 'meditate' : 'rest');
  for (const p of people.slice(2)) add(`Talk to ${p.name}`, 'low', 'talk');
  for (const r of roads.slice(2)) add(`Travel to ${r.id}`, risk(r.days), 'travel');
  return out;
}

export function generateChoices(state: SimulationState, ctx: ChoiceContext = {}): NarrationChoice[] {
  return choiceCandidates(state, ctx).slice(0, CHOICE_COUNT).map((c, i) => ({ id: i + 1, text: c.text, risk: c.risk }));
}

/** Would the rules be able to honour this suggestion? Pure, never throws. */
export function isHonourable(text: string, risk: RiskLevel, state: SimulationState): boolean {
  try {
    const action = interpretPlayerAction(text, state, risk);
    if (action.kind === 'travel' && !action.destinationId) return false;
    if (action.kind === 'travel' && action.destinationId === state.character.locationId) return false;
    return true;
  } catch {
    return false;
  }
}

/** Keep the narrator's suggestions the rules can honour; backfill the rest from the generator. */
export function mergeChoices(proposed: NarrationChoice[], state: SimulationState, ctx: ChoiceContext = {}): NarrationChoice[] {
  const kept = proposed.filter(c => isHonourable(c.text, c.risk, state));
  const seen = new Set(kept.map(c => c.text.toLowerCase()));
  for (const candidate of choiceCandidates(state, ctx)) {
    if (kept.length >= CHOICE_COUNT) break;
    if (!seen.has(candidate.text.toLowerCase())) { seen.add(candidate.text.toLowerCase()); kept.push(candidate); }
  }
  return kept.slice(0, CHOICE_COUNT).map((c, i) => ({ id: i + 1, text: c.text, risk: c.risk }));
}
