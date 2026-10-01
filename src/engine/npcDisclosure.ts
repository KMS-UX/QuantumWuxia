import type { JianghuState, RumorState } from './jianghu';
import type { SimulationState, StateEvent } from './types';

/**
 * Deterministic NPC disclosure: when the player talks successfully with an NPC,
 * that NPC shares at most ONE rumor they know and the player does not, the most
 * credible first (ties broken by id). The rumor becomes player knowledge through
 * the same fields the knowledge system already reads (`knownBy`, `knownRumorIds`,
 * `knowledgeRecords`), and the transfer is recorded as a `world.fact_discovered`
 * event so the ledger can explain why the player knows it.
 *
 * Secrets are deliberately never disclosed here; they surface only through the
 * existing disposition-gated knowledge path.
 */
export function discloseRumorToPlayer(
  jianghu: JianghuState,
  simulation: SimulationState,
  npcId: string,
): { jianghu: JianghuState; events: StateEvent[] } {
  const playerId = simulation.character.id;
  const npc = jianghu.npcs.find(n => n.id === npcId);
  if (!npc || !npc.alive || npc.locationId !== simulation.character.locationId) return { jianghu, events: [] };

  const shareable = jianghu.rumors
    .filter(r => r.knownBy.includes(npc.id) && !r.knownBy.includes(playerId))
    .sort((a: RumorState, b: RumorState) => b.credibility - a.credibility || a.id.localeCompare(b.id));
  const chosen = shareable[0];
  if (!chosen) return { jianghu, events: [] };

  const next: JianghuState = JSON.parse(JSON.stringify(jianghu));
  const rumor = next.rumors.find(r => r.id === chosen.id)!;
  rumor.knownBy.push(playerId);

  next.knowledgeRecords = next.knowledgeRecords ?? [];
  next.knowledgeRecords.push({
    id: `knowledge-rumor-${rumor.id}-${playerId}`,
    subjectId: playerId,
    fact: rumor.text,
    sourceId: rumor.id,
    sourceKind: 'rumor',
    confidence: rumor.credibility,
    discoveredTurn: simulation.world.turn,
    trueState: 'unknown',
  });
  next.knowledgeVersion += 1;
  simulation.world.knownRumorIds = Array.from(new Set([...(simulation.world.knownRumorIds ?? []), rumor.id]));

  return {
    jianghu: next,
    events: [{
      type: 'world.fact_discovered',
      causes: ['action:talk', 'resolution:success', `npc:${npc.id}:disclosure`],
      witnesses: [playerId, npc.id],
      knowledgeConsequences: [`player:fact:${rumor.text}`],
      causalLinks: [rumor.id],
      payload: { fact: rumor.text, source: rumor.id, via: npc.id, confidence: rumor.credibility },
    }],
  };
}
