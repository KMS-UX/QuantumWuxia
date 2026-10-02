import type { GameState } from '../types/game';
import type { ActionResolution, RiskLevel } from './types';
import { interpretPlayerAction } from './actionInterpreter';
import { enterSimulationBoundary, exitSimulationBoundary } from './simulationBoundary';
import { resolveAction } from './resolveAction';
import { consumeDraw, randomSeed, rollAt } from './rng';

export interface PreparedPlayerAction {
  resolution: ActionResolution;
  nextGameState: GameState;
}

/**
 * UI/save compatibility entry point.
 *
 * The deterministic engine operates only on SimulationState. GameState is
 * entered and exited through the canonical simulation boundary.
 */
export function resolvePlayerAction(
  gameState: GameState,
  description: string,
  risk: RiskLevel = 'medium',
  /** Explicit roll (tests, replays). When omitted the roll comes from the saved seed. */
  roll?: number,
): PreparedPlayerAction {
  if (!gameState.character) throw new Error('Cannot resolve an action without a character.');

  const simulation = enterSimulationBoundary(gameState, [gameState.location]);
  // Saves from before seeded rolls get a seed on their first action; from then on every roll is replayable.
  const rng = simulation.world.rng ?? { seed: randomSeed(), draws: 0 };
  const action = interpretPlayerAction(description, simulation, risk);
  const resolution = resolveAction(simulation, action, roll ?? rollAt(rng.seed, rng.draws));
  // An explicit roll consumes nothing, so a replay that injects rolls does not disturb the saved sequence.
  resolution.state.world.rng = roll === undefined ? consumeDraw(rng) : rng;
  const nextGameState = exitSimulationBoundary(gameState, resolution.state);

  return { resolution, nextGameState };
}
