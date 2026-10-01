import type { EventLedgerEntry } from './eventLedger';
import type { JianghuState, NPCMemory, RumorState } from './jianghu';

export interface NPCKnowledgeContext {
  npcId: string;
  knownLedgerEntries: EventLedgerEntry[];
  knownRumors: RumorState[];
  memories: NPCMemory[];
}

/**
 * Deterministic knowledge boundary for NPC agency.
 *
 * An NPC may know an event when it directly witnessed the event, when the
 * event explicitly granted knowledge to that NPC, or when the NPC was the
 * event actor. Global ledger history is never treated as universally known.
 */
export function canNpcKnowLedgerEntry(entry: EventLedgerEntry, npcId: string): boolean {
  if (entry.actorId === npcId) return true;
  if (entry.witnesses.includes(npcId)) return true;
  return entry.knowledgeConsequences.some(value => value.startsWith(`npc:${npcId}:`));
}

export function getNpcRelevantLedgerEvents(
  ledger: EventLedgerEntry[],
  npcId: string,
): EventLedgerEntry[] {
  return ledger.filter(entry => canNpcKnowLedgerEntry(entry, npcId));
}

export function getNpcKnownRumors(j: JianghuState, npcId: string): RumorState[] {
  return j.rumors.filter(rumor => rumor.knownBy.includes(npcId));
}

export function getNpcKnowledgeContext(
  j: JianghuState,
  ledger: EventLedgerEntry[],
  npcId: string,
): NPCKnowledgeContext {
  const npc = j.npcs.find(candidate => candidate.id === npcId);
  return {
    npcId,
    knownLedgerEntries: getNpcRelevantLedgerEvents(ledger, npcId),
    knownRumors: getNpcKnownRumors(j, npcId),
    memories: npc ? npc.memories.map(memory => ({ ...memory })) : [],
  };
}
