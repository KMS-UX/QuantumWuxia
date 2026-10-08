import { timeOf, type WorldTime } from './clock';
import type { SimulationState, ProposedAction } from './types';
import { weatherEffects, weatherOn, NIGHT_EFFECTS, type Weather } from './weather';
import { climateAt, isIndoors, routeTicks } from './worldMap';

/**
 * What the clock, the weather and the place do to an action. Framework only: it reads
 * the saved clock, map and seed, and nothing about any particular setting.
 */
export interface Environment {
  time: WorldTime;
  weather: Weather;
  indoors: boolean;
  /**
   * Whether this world has opted into the calendar (it carries a `clock`). Worlds without one
   * (older saves, bare test fixtures) still count ticks but feel no day, night or weather, so
   * their behaviour stays exactly what it was.
   */
  calendar: boolean;
}

export function environmentAt(sim: Pick<SimulationState, 'world'>, locationId: string): Environment {
  const time = timeOf(sim.world);
  const weather = weatherOn(time.day, time.season, climateAt(sim.world.map, locationId), sim.world.rng?.seed ?? 0);
  return { time, weather, indoors: isIndoors(sim.world.map, locationId), calendar: sim.world.clock !== undefined };
}

type Modified = 'stealth' | 'inspect' | 'travel' | 'attack';
const MODIFIED: ReadonlySet<string> = new Set(['stealth', 'inspect', 'travel', 'attack']);

/** Added to an action's difficulty by darkness and (outdoors) weather. */
export function difficultyModifier(kind: ProposedAction['kind'], env: Environment): number {
  if (!env.calendar || !MODIFIED.has(kind)) return 0;
  const k = kind as Modified;
  let total = 0;
  if (env.time.isNight && k !== 'attack') total += NIGHT_EFFECTS[k as keyof typeof NIGHT_EFFECTS] ?? 0;
  if (!env.indoors) total += weatherEffects(env.weather).difficulty[k] ?? 0;
  return total;
}

/** Fatigue added per tick by the weather, for anyone outdoors. */
export function weatherFatigue(env: Environment): number {
  return !env.calendar || env.indoors ? 0 : weatherEffects(env.weather).fatiguePerTick;
}

export interface Journey { ticks: number; baseTicks: number; weather: Weather; delayed: boolean }

/**
 * How long a journey takes: the map's route time stretched by the worse of the weather at
 * both ends on the day of departure. Undefined means no route exists on a map that has roads.
 */
export function journeyTicks(sim: Pick<SimulationState, 'world'>, from: string, to: string): Journey | undefined {
  const map = sim.world.map;
  const base = routeTicks(map, from, to);
  if (base === undefined) return map ? undefined : { ticks: 1, baseTicks: 1, weather: { kind: 'clear' }, delayed: false };
  if (base === 0) return { ticks: 0, baseTicks: 0, weather: { kind: 'clear' }, delayed: false };
  const a = environmentAt(sim, from).weather; const b = environmentAt(sim, to).weather;
  const worse = weatherEffects(a).travelMultiplier >= weatherEffects(b).travelMultiplier ? a : b;
  const calendar = sim.world.clock !== undefined;
  const ticks = calendar ? Math.ceil(base * weatherEffects(worse).travelMultiplier) : base;
  return { ticks, baseTicks: base, weather: worse, delayed: ticks > base };
}
