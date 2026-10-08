/**
 * The world clock (Game Bible section 11). Framework only: it knows nothing about
 * any particular setting. `world.turn` is the single source of time: one tick is one
 * four-hour watch, six ticks make a day. Date, season and time of day are derived
 * from it, so there is no second counter to drift out of sync and old saves just work.
 */
export const TICKS_PER_DAY = 6;
export const HOURS_PER_TICK = 24 / TICKS_PER_DAY;

export type Phase = 'late_night' | 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
export const PHASES: readonly Phase[] = ['late_night', 'dawn', 'morning', 'afternoon', 'evening', 'night'];
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export interface ClockConfig {
  daysPerSeason: number;
  /** Where the story starts: turn 0 is this season, day-of-season (1-based) and tick of day (0-5). */
  startSeason: Season;
  startDayOfSeason: number;
  startTickOfDay: number;
}

/** A morning in mid-autumn. */
export const DEFAULT_CLOCK: ClockConfig = { daysPerSeason: 30, startSeason: 'autumn', startDayOfSeason: 12, startTickOfDay: 2 };

export interface WorldTime {
  /** Ticks since the story began (== world.turn). */
  tick: number;
  /** Whole days since the story began (0-based). */
  day: number;
  /** 1-based day within the current season. */
  dayOfSeason: number;
  season: Season;
  /** 0-based year since the story began. */
  year: number;
  tickOfDay: number;
  phase: Phase;
  isNight: boolean;
}

export const isDarkPhase = (phase: Phase) => phase === 'late_night' || phase === 'night';

export function clockOf(world: { clock?: ClockConfig }): ClockConfig {
  return world.clock ?? DEFAULT_CLOCK;
}

export function timeAt(turn: number, config: ClockConfig = DEFAULT_CLOCK): WorldTime {
  const tick = Math.max(0, Math.floor(turn));
  const seasonIndex = SEASONS.indexOf(config.startSeason);
  const absoluteTick = tick + config.startTickOfDay;
  const day = Math.floor(absoluteTick / TICKS_PER_DAY);
  const tickOfDay = absoluteTick % TICKS_PER_DAY;
  const daysIntoSeasons = (config.startDayOfSeason - 1) + day;
  const seasonsElapsed = Math.floor(daysIntoSeasons / config.daysPerSeason);
  const phase = PHASES[tickOfDay];
  return {
    tick, day,
    dayOfSeason: (daysIntoSeasons % config.daysPerSeason) + 1,
    season: SEASONS[(seasonIndex + seasonsElapsed) % SEASONS.length],
    year: Math.floor((seasonIndex + seasonsElapsed) / SEASONS.length),
    tickOfDay, phase, isNight: isDarkPhase(phase),
  };
}

export function timeOf(world: { turn: number; clock?: ClockConfig }): WorldTime {
  return timeAt(world.turn, clockOf(world));
}

/** Ticks from now until the START of `phase` (a full day if it is the current phase). */
export function ticksUntilPhase(world: { turn: number; clock?: ClockConfig }, phase: Phase): number {
  const target = PHASES.indexOf(phase);
  const now = timeOf(world).tickOfDay;
  return ((target - now + TICKS_PER_DAY) % TICKS_PER_DAY) || TICKS_PER_DAY;
}

const PHASE_WORDS: Record<Phase, string> = {
  late_night: 'the small hours', dawn: 'dawn', morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'night',
};
export const phaseWord = (phase: Phase) => PHASE_WORDS[phase];

/** "Morning, day 12 of autumn" (year only once a year has passed). */
export function describeTime(t: WorldTime): string {
  const when = phaseWord(t.phase);
  return `${when.charAt(0).toUpperCase()}${when.slice(1)}, day ${t.dayOfSeason} of ${t.season}${t.year > 0 ? `, year ${t.year + 1}` : ''}`;
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** Plain words for a span of ticks: "about four hours", "a day and a half", "three days". */
export function describeDuration(ticks: number): string {
  if (ticks <= 0) return 'no time at all';
  if (ticks < TICKS_PER_DAY) return `about ${ticks * HOURS_PER_TICK} hours`;
  const whole = Math.floor(ticks / TICKS_PER_DAY);
  const rest = ticks % TICKS_PER_DAY;
  const days = (n: number) => (n === 1 ? 'a day' : `${word(n)} days`);
  if (rest === 0) return days(whole);
  if (rest === TICKS_PER_DAY / 2) return whole === 1 ? 'a day and a half' : `${word(whole)} and a half days`;
  return rest < TICKS_PER_DAY / 2 ? `a little over ${days(whole)}` : `nearly ${days(whole + 1)}`;
}

export function validClock(c: ClockConfig): boolean {
  return Number.isInteger(c.daysPerSeason) && c.daysPerSeason >= 1 && c.daysPerSeason <= 366
    && SEASONS.includes(c.startSeason)
    && Number.isInteger(c.startDayOfSeason) && c.startDayOfSeason >= 1 && c.startDayOfSeason <= c.daysPerSeason
    && Number.isInteger(c.startTickOfDay) && c.startTickOfDay >= 0 && c.startTickOfDay < TICKS_PER_DAY;
}
