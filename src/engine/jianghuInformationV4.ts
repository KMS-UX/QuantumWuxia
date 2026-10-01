import type { SimulationState, StateEvent } from './types';
import type { JianghuState, KnowledgeRecord, CausalChainState, NPCState, RumorState } from './jianghu';

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

function clone(j: JianghuState): JianghuState {
  return JSON.parse(JSON.stringify(j)) as JianghuState;
}

export function recordKnowledge(
  input: JianghuState,
  subjectId: string,
  fact: string,
  sourceId: string,
  sourceKind: KnowledgeRecord['sourceKind'],
  confidence: number,
  turn: number,
): JianghuState {
  const j = clone(input);
  const existing = j.knowledgeRecords?.find(k => k.subjectId === subjectId && k.fact === fact && k.sourceId === sourceId);
  if (existing) {
    existing.confidence = Math.max(existing.confidence, clamp(confidence));
    existing.lastVerifiedTurn = turn;
  } else {
    const record: KnowledgeRecord = {
      id: `knowledge-${turn}-${(j.knowledgeRecords?.length ?? 0) + 1}`,
      subjectId, fact, sourceId, sourceKind,
      confidence: clamp(confidence),
      discoveredTurn: turn,
      trueState: 'unknown',
    };
    j.knowledgeRecords = [...(j.knowledgeRecords ?? []), record];
    j.knowledgeVersion += 1;
  }
  return j;
}

function localRumors(j: JianghuState, locationId: string): RumorState[] {
  return j.rumors.filter(r => r.currentLocationId === locationId);
}

function sourceForNpc(npc: NPCState, fact: string): KnowledgeRecord | undefined {
  return npc.memories.find(m => m.event.toLowerCase().includes(fact.toLowerCase()))
    ? {
        id: `memory-source-${npc.id}-${fact}`,
        subjectId: npc.id,
        fact,
        sourceId: npc.id,
        sourceKind: 'npc',
        confidence: 60,
        discoveredTurn: 0,
        trueState: 'unknown',
      }
    : undefined;
}

/**
 * Convert already-established world facts into explicit provenance.
 * Player knowledge is updated only by deterministic discovery rules.
 */
export function processInformation(
  input: JianghuState,
  simulation: SimulationState,
): { jianghu: JianghuState; events: StateEvent[] } {
  const j = clone(input);
  const events: StateEvent[] = [];
  const turn = simulation.world.turn;
  const playerId = simulation.character.id;

  for (const rumor of localRumors(j, simulation.character.locationId)) {
    if (!rumor.knownBy.includes(playerId)) continue;
    j.knowledgeRecords = j.knowledgeRecords ?? [];
    const existing = j.knowledgeRecords.find(k => k.subjectId === playerId && k.fact === rumor.text);
    if (!existing) {
      j.knowledgeRecords.push({
        id: `knowledge-rumor-${rumor.id}-${playerId}`,
        subjectId: playerId,
        fact: rumor.text,
        sourceId: rumor.id,
        sourceKind: 'rumor',
        confidence: rumor.credibility,
        discoveredTurn: turn,
        trueState: 'unknown',
      });
      j.knowledgeVersion += 1;
      events.push({ type: 'world.fact_discovered', payload: { fact: rumor.text, source: rumor.id, confidence: rumor.credibility } });
    }
    simulation.world.knownRumorIds = Array.from(new Set([...(simulation.world.knownRumorIds ?? []), rumor.id]));
  }

  for (const npc of j.npcs) {
    if (!npc.alive || npc.locationId !== simulation.character.locationId) continue;
    const source = npc.secrets.length > 0 && npc.disposition >= 30
      ? sourceForNpc(npc, npc.secrets[0])
      : undefined;
    if (source && !simulation.world.knownNpcIds?.includes(npc.id)) continue;
    if (source) {
      j.knowledgeRecords = j.knowledgeRecords ?? [];
      if (!j.knowledgeRecords.some(k => k.subjectId === playerId && k.fact === source.fact)) {
        j.knowledgeRecords.push({ ...source, subjectId: playerId, id: `knowledge-secret-${npc.id}-${turn}`, discoveredTurn: turn });
        j.knowledgeVersion += 1;
        simulation.world.knownNpcIds = Array.from(new Set([...(simulation.world.knownNpcIds ?? []), npc.id]));
        events.push({ type: 'world.fact_discovered', payload: { fact: source.fact, source: npc.id, confidence: source.confidence } });
      }
    }
  }

  return { jianghu: j, events };
}

function ensureChain(j: JianghuState, eventId: string, kind: CausalChainState['kind'], description: string, turn: number): CausalChainState {
  const existing = j.causalChains?.find(c => c.rootEventId === eventId && c.active);
  if (existing) return existing;
  const chain: CausalChainState = {
    id: `chain-${eventId}`,
    rootEventId: eventId,
    step: 0,
    kind,
    description,
    sourceIds: [eventId],
    active: true,
    createdTurn: turn,
    nextCheckTurn: turn + 1,
  };
  j.causalChains = [...(j.causalChains ?? []), chain];
  return chain;
}

/**
 * Turn world events into bounded, inspectable consequence chains.
 * Each active chain advances by at most one step per tick.
 */
export function advanceCausalChains(
  input: JianghuState,
  simulation: SimulationState,
): { jianghu: JianghuState; events: StateEvent[] } {
  const j = clone(input);
  const events: StateEvent[] = [];
  const turn = simulation.world.turn;

  for (const worldEvent of j.worldEvents.filter(e => e.active)) {
    let kind: CausalChainState['kind'] = 'social';
    if (worldEvent.kind === 'conflict' || worldEvent.kind === 'political') kind = 'faction';
    if (worldEvent.kind === 'market') kind = 'economic';
    if (worldEvent.kind === 'rumor') kind = 'information';
    const chain = ensureChain(j, worldEvent.id, kind, worldEvent.description, turn);
    if (!chain.active || chain.nextCheckTurn > turn) continue;

    chain.step += 1;
    chain.sourceIds.push(`turn-${turn}`);
    chain.nextCheckTurn = turn + 1;

    if (chain.step === 1 && kind === 'information') {
      worldEvent.severity = clamp(worldEvent.severity + 1, 1, 5);
    } else if (chain.step === 1 && kind === 'faction') {
      for (const factionId of worldEvent.factionIds) {
        const faction = j.factions.find(f => f.id === factionId);
        if (faction) faction.internalTension = clamp(faction.internalTension + worldEvent.severity * 2, 0, 100);
      }
    } else if (chain.step === 1 && kind === 'economic') {
      const market = j.markets?.find(m => m.locationId === worldEvent.locationId);
      if (market) {
        for (const good of Object.keys(market.scarcity)) market.scarcity[good] = clamp(market.scarcity[good] + worldEvent.severity * 2);
      }
    } else if (chain.step >= 2) {
      const nearby = j.npcs.filter(n => n.alive && n.locationId === simulation.character.locationId);
      for (const npc of nearby) {
        npc.disposition = clamp(npc.disposition - (kind === 'faction' ? 1 : 0), -100, 100);
      }
    }

    events.push({
      type: 'world.causal_chain_advanced',
      payload: { chainId: chain.id, rootEventId: chain.rootEventId, step: chain.step, kind: chain.kind },
    });

    if (chain.step >= 3 || !worldEvent.active) {
      chain.active = false;
      events.push({
        type: 'world.causal_chain_completed',
        payload: { chainId: chain.id, rootEventId: chain.rootEventId },
      });
    }
  }

  return { jianghu: j, events };
}
