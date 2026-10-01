import type { ProposedAction, ResolutionStatus, SimulationState, StateEvent } from './types';

export interface EventLedgerEntry {
  eventId: string;
  turn: number;
  actorId: string;
  actionKind: ProposedAction['kind'];
  actionDescription: string;
  targetIds: string[];
  locationId: string;
  causes: string[];
  effects: string[];
  witnesses: string[];
  knowledgeConsequences: string[];
  provenance: 'deterministic-resolver';
  causalLinks: string[];
  eventType: StateEvent['type'];
  payload: StateEvent['payload'];
}

export interface EventLedgerContext {
  status: ResolutionStatus;
  roll: number;
  difficulty: number;
}

/**
 * Normalize the existing StateEvent stream into a richer machine-readable
 * ledger without changing the authoritative simulation rules.
 *
 * The ledger is deliberately derived, not AI-authored.
 */
export function createEventLedger(
  state: SimulationState,
  action: ProposedAction,
  events: StateEvent[],
  context: EventLedgerContext,
): EventLedgerEntry[] {
  const targetIds = action.targetId ? [action.targetId] : [];
  const locationId = state.character.locationId;

  return events.map((event, index) => {
    const effectKeys = Object.keys(event.payload);
    const knowledgeConsequences =
      event.type === 'world.fact_discovered' && typeof event.payload.fact === 'string'
        ? [event.payload.fact]
        : event.type === 'world.rumor_spread'
          ? ['rumor.spread']
          : [];

    const causalLinks = Object.entries(event.payload)
      .filter(([key, value]) => /cause|causal|chain/i.test(key) && typeof value === 'string')
      .map(([, value]) => value);

    return {
      eventId: `t${state.world.turn}-${index + 1}-${event.type}`,
      turn: state.world.turn,
      actorId: action.actorId ?? state.character.id,
      actionKind: action.kind,
      actionDescription: action.description,
      targetIds,
      locationId,
      causes: [`action:${action.kind}`, `resolution:${context.status}`],
      effects: effectKeys,
      witnesses: [],
      knowledgeConsequences,
      provenance: 'deterministic-resolver',
      causalLinks,
      eventType: event.type,
      payload: { ...event.payload },
    };
  });
}
