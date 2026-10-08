import type { GoalKind, JianghuState, KnowledgeRecord, RumorState, WorldEventState } from './jianghu';
import type { SimulationState, StateEvent } from './types';

/**
 * Finale hooks: the authored (or generated) payoff when a world event's causal
 * chain runs its course.
 *
 * A finale is plain, serializable data attached to a `WorldEventState`. The
 * engine evaluates its conditions against the CURRENT world state, picks the
 * first outcome whose conditions all hold, and applies that outcome's effects.
 * No randomness and no LLM are involved, so the same state always yields the
 * same outcome (Game Bible section 4), and because it is data it survives
 * save/load. Content lives in `src/world/content`; the engine never imports it.
 */

export type FinaleCondition =
  | { kind: 'player_at'; locationId: string }
  | { kind: 'player_knows_rumor'; rumorId: string }
  | { kind: 'faction_tension_at_least'; factionId: string; value: number }
  | { kind: 'faction_tension_below'; factionId: string; value: number }
  | { kind: 'faction_hostility_at_least'; factionAId: string; factionBId: string; value: number }
  | { kind: 'npc_alive'; npcId: string }
  | { kind: 'npc_disposition_at_least'; npcId: string; value: number }
  | { kind: 'npc_disposition_below'; npcId: string; value: number }
  | { kind: 'market_scarcity_at_least'; locationId: string; good: string; value: number };

export interface FinaleGoalSpec {
  id: string;
  kind: GoalKind;
  description: string;
  priority: number;
  targetId?: string;
  notBefore?: number;
  settle?: boolean;
}

export type FinaleEffect =
  | { kind: 'adjust_faction'; factionId: string; tension?: number; influence?: number; resources?: number; playerReputation?: number }
  | { kind: 'adjust_faction_relation'; factionAId: string; factionBId: string; trust?: number; hostility?: number; trade?: number }
  | { kind: 'adjust_npc'; npcId: string; disposition?: number; resources?: number; moveTo?: string }
  | { kind: 'add_npc_goal'; npcId: string; goal: FinaleGoalSpec; retireOthers?: boolean }
  | { kind: 'adjust_market'; locationId: string; scarcity: Record<string, number> }
  | { kind: 'spread_rumor'; id: string; text: string; origin: string; locationIds: string[]; credibility: number }
  | { kind: 'start_event'; event: Omit<WorldEventState, 'active' | 'createdTurn'> };

export interface FinaleOutcome {
  id: string;
  /** One line: what happened (what a witness would say). */
  headline: string;
  /** One or two sentences of observable detail for the narrator. */
  description: string;
  /** All must hold. An outcome with no conditions always matches, so put it last. */
  when: FinaleCondition[];
  effects: FinaleEffect[];
}

export interface FinaleSpec {
  outcomes: FinaleOutcome[];
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Evaluate a single condition against the current state. Unknown ids make a condition false. */
export function conditionHolds(c: FinaleCondition, j: JianghuState, sim: SimulationState): boolean {
  switch (c.kind) {
    case 'player_at':
      return sim.character.locationId === c.locationId;
    case 'player_knows_rumor':
      return (sim.world.knownRumorIds ?? []).includes(c.rumorId)
        || (j.rumors.find(r => r.id === c.rumorId)?.knownBy.includes(sim.character.id) ?? false);
    case 'faction_tension_at_least': {
      const f = j.factions.find(x => x.id === c.factionId);
      return !!f && f.internalTension >= c.value;
    }
    case 'faction_tension_below': {
      const f = j.factions.find(x => x.id === c.factionId);
      return !!f && f.internalTension < c.value;
    }
    case 'faction_hostility_at_least': {
      const r = (j.factionRelations ?? []).find(x =>
        (x.factionAId === c.factionAId && x.factionBId === c.factionBId) || (x.factionAId === c.factionBId && x.factionBId === c.factionAId));
      return !!r && r.hostility >= c.value;
    }
    case 'npc_alive':
      return j.npcs.some(n => n.id === c.npcId && n.alive);
    case 'npc_disposition_at_least': {
      const n = j.npcs.find(x => x.id === c.npcId);
      return !!n && n.alive && n.disposition >= c.value;
    }
    case 'npc_disposition_below': {
      const n = j.npcs.find(x => x.id === c.npcId);
      return !!n && n.alive && n.disposition < c.value;
    }
    case 'market_scarcity_at_least': {
      const m = j.markets?.find(x => x.locationId === c.locationId);
      return !!m && (m.scarcity[c.good] ?? 0) >= c.value;
    }
  }
}

/** The first outcome whose conditions all hold, or undefined. Pure. */
export function selectFinaleOutcome(spec: FinaleSpec, j: JianghuState, sim: SimulationState): FinaleOutcome | undefined {
  return spec.outcomes.find(o => o.when.every(c => conditionHolds(c, j, sim)));
}

/** Apply one effect in place. Returns false when it referenced something that does not exist. */
function applyEffect(e: FinaleEffect, j: JianghuState, sim: SimulationState, turn: number): boolean {
  switch (e.kind) {
    case 'adjust_faction': {
      const f = j.factions.find(x => x.id === e.factionId);
      if (!f) return false;
      if (e.tension) f.internalTension = clamp(f.internalTension + e.tension);
      if (e.influence) f.influence = clamp(f.influence + e.influence);
      if (e.resources) f.resources = clamp(f.resources + e.resources);
      if (e.playerReputation) f.playerReputation = clamp(f.playerReputation + e.playerReputation, -100, 100);
      return true;
    }
    case 'adjust_faction_relation': {
      const r = (j.factionRelations ?? []).find(x =>
        (x.factionAId === e.factionAId && x.factionBId === e.factionBId) || (x.factionAId === e.factionBId && x.factionBId === e.factionAId));
      if (!r) return false;
      if (e.trust) r.trust = clamp(r.trust + e.trust, -100, 100);
      if (e.hostility) r.hostility = clamp(r.hostility + e.hostility);
      if (e.trade) r.trade = clamp(r.trade + e.trade);
      return true;
    }
    case 'adjust_npc': {
      const n = j.npcs.find(x => x.id === e.npcId);
      if (!n || !n.alive) return false;
      if (e.disposition) n.disposition = clamp(n.disposition + e.disposition, -100, 100);
      if (e.resources) n.resources = clamp(n.resources + e.resources);
      if (e.moveTo) {
        if (!sim.world.locationIds.includes(e.moveTo)) return false;
        // A story relocation is a change of life, not an errand: they live there now and drop the old routine.
        n.locationId = e.moveTo; n.homeId = e.moveTo; n.routine = undefined; n.transit = undefined;
      }
      return true;
    }
    case 'add_npc_goal': {
      const n = j.npcs.find(x => x.id === e.npcId);
      if (!n || !n.alive) return false;
      if (e.retireOthers) for (const g of n.goals) g.active = false;
      n.goals = n.goals.filter(g => g.id !== e.goal.id);
      n.goals.push({ ...e.goal, priority: clamp(e.goal.priority), progress: 0, active: true });
      return true;
    }
    case 'adjust_market': {
      const m = j.markets?.find(x => x.locationId === e.locationId);
      if (!m) return false;
      for (const [good, delta] of Object.entries(e.scarcity)) {
        if (!(good in m.scarcity)) continue;
        m.scarcity[good] = clamp(m.scarcity[good] + delta);
        m.priceMultipliers[good] = Number((1 + m.scarcity[good] / 100).toFixed(2));
      }
      m.lastUpdatedTurn = turn;
      return true;
    }
    case 'spread_rumor': {
      let created = false;
      for (const locationId of e.locationIds) {
        if (!sim.world.locationIds.includes(locationId)) continue;
        const id = `${e.id}-${slug(locationId)}`;
        if (j.rumors.some(r => r.id === id)) continue;
        const witnesses = j.npcs.filter(n => n.alive && n.locationId === locationId).map(n => n.id);
        const rumor: RumorState = {
          id, text: e.text, origin: e.origin, currentLocationId: locationId,
          status: e.credibility >= 60 ? 'plausible' : 'unverified',
          credibility: clamp(e.credibility), knownBy: witnesses, createdTurn: turn, spreadRate: 1,
        };
        j.rumors.push(rumor);
        created = true;
      }
      return created;
    }
    case 'start_event': {
      if (j.worldEvents.some(w => w.id === e.event.id)) return false;
      if (j.causalChains?.some(c => c.rootEventId === e.event.id)) return false;
      j.worldEvents.push({ ...JSON.parse(JSON.stringify(e.event)), active: true, createdTurn: turn });
      return true;
    }
  }
}

export interface FinaleResult {
  outcome?: FinaleOutcome;
  event?: StateEvent;
}

/**
 * Resolve `worldEvent`'s finale in place on `j` (callers pass a working copy).
 * The event ends (`active = false`) whether or not an outcome matched, so a
 * finale can never fire twice. Returns the structured event for the ledger.
 */
export function applyFinale(j: JianghuState, sim: SimulationState, worldEvent: WorldEventState): FinaleResult {
  const spec = worldEvent.finale;
  if (!spec) return {};
  worldEvent.active = false;

  const outcome = selectFinaleOutcome(spec, j, sim);
  if (!outcome) return {};

  const turn = sim.world.turn;
  const playerId = sim.character.id;
  const present = !!worldEvent.locationId && sim.character.locationId === worldEvent.locationId;
  // Witness set is computed before effects so a move-away effect cannot erase who saw the moment.
  const onlookers = present && worldEvent.locationId
    ? j.npcs.filter(n => n.alive && n.locationId === worldEvent.locationId).map(n => n.id)
    : [];

  let applied = 0; let skipped = 0;
  for (const effect of outcome.effects) (applyEffect(effect, j, sim, turn) ? applied++ : skipped++);

  if (present) {
    const record: KnowledgeRecord = {
      id: `knowledge-finale-${worldEvent.id}-${playerId}`,
      subjectId: playerId, fact: outcome.headline, sourceId: worldEvent.id, sourceKind: 'observation',
      confidence: 95, discoveredTurn: turn, lastVerifiedTurn: turn, trueState: 'true',
    };
    j.knowledgeRecords = [...(j.knowledgeRecords ?? []).filter(k => k.id !== record.id), record];
    j.knowledgeVersion += 1;
    // Anyone who saw it can say so; rumors spread at the site already list the witnesses.
    for (const r of j.rumors) if (r.createdTurn === turn && r.currentLocationId === worldEvent.locationId && !r.knownBy.includes(playerId)) r.knownBy.push(playerId);
    sim.world.knownRumorIds = Array.from(new Set([
      ...(sim.world.knownRumorIds ?? []),
      ...j.rumors.filter(r => r.knownBy.includes(playerId)).map(r => r.id),
    ]));
  }

  const event: StateEvent = {
    type: 'world.finale_resolved',
    causes: [`world-event:${worldEvent.id}`, `finale-outcome:${outcome.id}`, `causal-chain:chain-${worldEvent.id}:completion`],
    witnesses: present ? [playerId, ...onlookers] : [],
    knowledgeConsequences: present ? [`player:fact:${outcome.headline}`] : [],
    causalLinks: [worldEvent.id],
    payload: {
      eventId: worldEvent.id, outcomeId: outcome.id, headline: outcome.headline, description: outcome.description,
      locationId: worldEvent.locationId ?? null, witnessedByPlayer: present, effectsApplied: applied, effectsSkipped: skipped,
    },
  };
  return { outcome, event };
}

/** Structural problems in a finale spec (used by content tests and any future generator). */
export function validateFinaleSpec(spec: FinaleSpec, j: JianghuState, locationIds: string[]): string[] {
  const issues: string[] = [];
  const npc = (id: string) => j.npcs.some(n => n.id === id);
  const faction = (id: string) => j.factions.some(f => f.id === id);
  if (!spec.outcomes.length) issues.push('finale has no outcomes');
  const ids = new Set<string>();
  spec.outcomes.forEach((o, i) => {
    if (ids.has(o.id)) issues.push(`duplicate outcome id ${o.id}`);
    ids.add(o.id);
    if (!o.headline.trim() || !o.description.trim()) issues.push(`${o.id}: headline/description required`);
    if (i === spec.outcomes.length - 1 && o.when.length) issues.push(`${o.id}: last outcome must be unconditional`);
    for (const c of o.when) {
      if ('factionId' in c && !faction(c.factionId)) issues.push(`${o.id}: unknown faction ${c.factionId}`);
      if (c.kind === 'faction_hostility_at_least' && !(faction(c.factionAId) && faction(c.factionBId))) issues.push(`${o.id}: unknown faction in hostility check`);
      if ('npcId' in c && !npc(c.npcId)) issues.push(`${o.id}: unknown npc ${c.npcId}`);
      if ('locationId' in c && !locationIds.includes(c.locationId)) issues.push(`${o.id}: unknown location ${c.locationId}`);
      if (c.kind === 'player_knows_rumor' && !j.rumors.some(r => r.id === c.rumorId)) issues.push(`${o.id}: unknown rumor ${c.rumorId}`);
    }
    for (const e of o.effects) {
      if ('factionId' in e && !faction(e.factionId)) issues.push(`${o.id}: unknown faction ${e.factionId}`);
      if (e.kind === 'adjust_faction_relation' && !(faction(e.factionAId) && faction(e.factionBId))) issues.push(`${o.id}: unknown faction in relation`);
      if ('npcId' in e && !npc(e.npcId)) issues.push(`${o.id}: unknown npc ${e.npcId}`);
      if (e.kind === 'adjust_npc' && e.moveTo && !locationIds.includes(e.moveTo)) issues.push(`${o.id}: unknown moveTo ${e.moveTo}`);
      if (e.kind === 'adjust_market' && !j.markets?.some(m => m.locationId === e.locationId)) issues.push(`${o.id}: no market at ${e.locationId}`);
      if (e.kind === 'spread_rumor') e.locationIds.forEach(l => { if (!locationIds.includes(l)) issues.push(`${o.id}: unknown rumor location ${l}`); });
      if (e.kind === 'start_event' && e.event.finale) issues.push(...validateFinaleSpec(e.event.finale, j, locationIds).map(m => `${o.id} > ${e.event.id}: ${m}`));
    }
  });
  return issues;
}
