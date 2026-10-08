import { PHASES, isDarkPhase, timeOf, type Phase } from './clock';
import type { JianghuState, NPCState } from './jianghu';
import type { SimulationState, StateEvent } from './types';
import { TRANSIT_LOCATION, routeTicks } from './worldMap';

/**
 * Daily routines, sleep and travel for NPCs (Bible sections 9 and 11). Framework only:
 * a setting supplies each NPC's `homeId` and `routine` as data; with neither, an NPC
 * simply sleeps in the small hours and otherwise stays where they are.
 */
export type Activity = 'work' | 'sleep' | 'leisure' | 'patrol' | 'worship';
export interface RoutineEntry { phases: Phase[]; locationId: string; activity?: Activity }
export interface NpcTransit { from: string; to: string; arriveTurn: number }

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The routine entry in force at this phase, if any (first match wins). */
export function routineEntry(npc: NPCState, phase: Phase): RoutineEntry | undefined {
  return npc.routine?.find(e => e.phases.includes(phase));
}

/** Whether the NPC is asleep right now. An explicit routine wins; otherwise everyone sleeps in the small hours. */
export function isAsleep(npc: NPCState, phase: Phase): boolean {
  if (!npc.alive || npc.transit) return false;
  const entry = routineEntry(npc, phase);
  if (entry) return entry.activity === 'sleep';
  if (npc.routine?.some(e => e.phases.includes(phase))) return false;
  return phase === 'late_night' && !npc.routine;
}

/** Where the NPC's routine wants them at this phase, or undefined to stay put. */
export function desiredLocation(npc: NPCState, phase: Phase): string | undefined {
  const entry = routineEntry(npc, phase);
  if (entry) return entry.locationId;
  if (!npc.routine && npc.homeId && isDarkPhase(phase)) return npc.homeId;
  return undefined;
}

/** Start an NPC walking somewhere. With no known route they arrive at once; returns the travel time. */
export function beginNpcTravel(npc: NPCState, to: string, sim: SimulationState): number {
  const ticks = routeTicks(sim.world.map, npc.locationId, to) ?? 0;
  if (ticks <= 0) { npc.locationId = to; npc.transit = undefined; return 0; }
  npc.transit = { from: npc.locationId, to, arriveTurn: sim.world.turn + ticks };
  npc.locationId = TRANSIT_LOCATION;
  return ticks;
}

/**
 * One tick of NPC movement: arrivals first, then routines for anyone free to follow one.
 * An NPC pursuing a travel goal is on their own errand and ignores their routine.
 */
export function advanceRoutines(j: JianghuState, sim: SimulationState, events: StateEvent[]): void {
  const turn = sim.world.turn;
  const phase = timeOf(sim.world).phase;
  const here = sim.character.locationId;
  const playerId = sim.character.id;
  const note = (npc: NPCState, from: string, to: string, arriving: boolean) => {
    const seen = arriving ? to === here : from === here;
    events.push({
      type: 'world.npc_moved',
      causes: [`npc:${npc.id}:${arriving ? 'arrival' : 'departure'}`],
      witnesses: seen ? [playerId, npc.id] : [npc.id],
      knowledgeConsequences: seen ? [`player:saw:${npc.id}:${arriving ? 'arrive' : 'leave'}`] : [],
      payload: { npcId: npc.id, from, to, arriving, arriveTurn: npc.transit?.arriveTurn ?? turn },
    });
  };

  for (const npc of j.npcs) {
    if (!npc.alive) continue;
    if (npc.transit) {
      if (turn >= npc.transit.arriveTurn) {
        const { from, to } = npc.transit;
        npc.locationId = to; npc.transit = undefined;
        note(npc, from, to, true);
      }
      continue;
    }
    if (npc.goals.some(g => g.active && g.kind === 'travel' && (g.notBefore === undefined || turn >= g.notBefore))) continue;
    const want = desiredLocation(npc, phase);
    if (!want || want === npc.locationId) continue;
    const from = npc.locationId;
    const ticks = beginNpcTravel(npc, want, sim);
    note(npc, from, want, ticks === 0);
  }
}

/** The first phase, counting forward from `from`, at which this NPC is awake; undefined if they never are. */
export function nextAwakePhase(npc: NPCState, from: Phase): Phase | undefined {
  const start = PHASES.indexOf(from);
  for (let i = 1; i <= PHASES.length; i++) {
    const phase = PHASES[(start + i) % PHASES.length];
    if (!isAsleep(npc, phase)) return phase;
  }
  return undefined;
}

export const sleepinessOf = (npc: NPCState, sim: SimulationState): boolean => isAsleep(npc, timeOf(sim.world).phase);
export const clampTicks = (n: number) => clampNum(Math.round(n), 1, 24);
