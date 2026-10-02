import type { SimulationState } from './types';

/**
 * Replayable randomness (Game Bible section 4: "use injected random-number
 * generation for tests and reproducible bug reports").
 *
 * The seed and a draw counter live in `SimulationState.world.rng`, so they are
 * saved with the game. Roll N of a game is a pure function of (seed, N): given
 * the seed and the ordered list of player actions, any turn can be replayed
 * exactly. Nothing here calls Math.random; the only entropy enters when the
 * seed is first chosen, at the product boundary.
 */
export interface RngState { seed: number; draws: number }

/** Deterministic roll in 0..99 for (seed, draw). Integer hash (murmur-style finaliser), no state. */
export function rollAt(seed: number, draw: number): number {
  let h = (seed ^ Math.imul(draw + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h % 100;
}

/** A fresh 32-bit seed from the platform. Call only at the product boundary, never inside the engine. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

/** The roll the next action will use, without consuming it. */
export function peekRoll(state: SimulationState): number | undefined {
  const rng = state.world.rng;
  return rng ? rollAt(rng.seed, rng.draws) : undefined;
}

/** The state with one draw consumed. Pure: returns the new rng value. */
export function consumeDraw(rng: RngState): RngState {
  return { seed: rng.seed, draws: rng.draws + 1 };
}
