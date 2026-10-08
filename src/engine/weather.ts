import { rollAt } from './rng';
import type { Climate } from './worldMap';
import type { Season } from './clock';

/**
 * Deterministic weather (Bible section 11). A pure function of (seed, day, season,
 * climate): nothing is stored, so replays, saves and tests always agree, and weather
 * persists for two-day spells instead of flickering every turn. Framework only.
 */
export type WeatherKind = 'clear' | 'overcast' | 'rain' | 'storm' | 'fog' | 'snow' | 'blizzard' | 'heat';
export interface Weather { kind: WeatherKind }

type Table = Array<[WeatherKind, number]>; // weights sum to 100
const BASE: Record<Season, Table> = {
  spring: [['clear', 40], ['overcast', 20], ['rain', 28], ['fog', 8], ['storm', 4]],
  summer: [['clear', 44], ['heat', 14], ['overcast', 12], ['rain', 18], ['storm', 12]],
  autumn: [['clear', 38], ['overcast', 26], ['rain', 18], ['fog', 14], ['storm', 4]],
  winter: [['clear', 28], ['overcast', 28], ['snow', 28], ['fog', 8], ['storm', 8]],
};
const CLIMATE_SHIFT: Partial<Record<Climate, Partial<Record<Season, Table>>>> = {
  mountain: { winter: [['snow', 40], ['blizzard', 16], ['clear', 20], ['overcast', 20], ['fog', 4]], autumn: [['clear', 30], ['overcast', 26], ['fog', 18], ['rain', 18], ['snow', 8]] },
  cold: { winter: [['blizzard', 28], ['snow', 36], ['clear', 20], ['overcast', 16]], autumn: [['clear', 30], ['overcast', 26], ['snow', 24], ['fog', 12], ['storm', 8]] },
  marsh: { spring: [['fog', 36], ['rain', 28], ['overcast', 20], ['clear', 16]], autumn: [['fog', 40], ['rain', 22], ['overcast', 22], ['clear', 16]], summer: [['heat', 26], ['fog', 24], ['rain', 24], ['clear', 26]] },
  river: { autumn: [['fog', 26], ['clear', 30], ['overcast', 22], ['rain', 18], ['storm', 4]] },
};

const CLIMATE_KEY: Record<Climate, number> = { temperate: 1, river: 2, mountain: 3, marsh: 4, cold: 5, forest: 6 };

export function weatherOn(day: number, season: Season, climate: Climate, seed = 0): Weather {
  const table = CLIMATE_SHIFT[climate]?.[season] ?? BASE[season];
  const spell = Math.floor(day / 2);
  const roll = rollAt((seed ^ Math.imul(CLIMATE_KEY[climate], 0x27d4eb2f)) >>> 0, spell);
  let acc = 0;
  for (const [kind, weight] of table) { acc += weight; if (roll < acc) return { kind }; }
  return { kind: table[table.length - 1][0] };
}

export interface WeatherEffects {
  /** Multiplier on journey time (rounded up). */
  travelMultiplier: number;
  /** Added to the difficulty of the action kind (negative helps). Outdoors only. */
  difficulty: Partial<Record<'stealth' | 'inspect' | 'travel' | 'attack', number>>;
  /** Extra fatigue per tick spent outdoors. */
  fatiguePerTick: number;
}

const EFFECTS: Record<WeatherKind, WeatherEffects> = {
  clear: { travelMultiplier: 1, difficulty: {}, fatiguePerTick: 0 },
  overcast: { travelMultiplier: 1, difficulty: {}, fatiguePerTick: 0 },
  rain: { travelMultiplier: 1.25, difficulty: { stealth: -5, inspect: 5, travel: 5 }, fatiguePerTick: 1 },
  storm: { travelMultiplier: 1.5, difficulty: { stealth: -10, inspect: 10, travel: 10, attack: 5 }, fatiguePerTick: 2 },
  fog: { travelMultiplier: 1.25, difficulty: { stealth: -10, inspect: 10, travel: 5 }, fatiguePerTick: 0 },
  snow: { travelMultiplier: 1.5, difficulty: { stealth: -5, inspect: 5, travel: 10 }, fatiguePerTick: 1 },
  blizzard: { travelMultiplier: 2, difficulty: { stealth: -10, inspect: 15, travel: 20, attack: 10 }, fatiguePerTick: 3 },
  heat: { travelMultiplier: 1.25, difficulty: { travel: 5 }, fatiguePerTick: 2 },
};
export const weatherEffects = (w: Weather): WeatherEffects => EFFECTS[w.kind];

const WORDS: Record<WeatherKind, string> = {
  clear: 'clear skies', overcast: 'an overcast sky', rain: 'steady rain', storm: 'a storm', fog: 'thick fog', snow: 'falling snow', blizzard: 'a howling blizzard', heat: 'oppressive heat',
};
export const weatherWord = (w: Weather) => WORDS[w.kind];

/** Darkness helps the sneaking and hinders the looking, outdoors or in. */
export const NIGHT_EFFECTS = { stealth: -10, inspect: 10, travel: 5 } as const;
