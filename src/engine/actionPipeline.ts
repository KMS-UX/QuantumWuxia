import type { GameState } from '../types/game';
import type { ActionResolution, RiskLevel } from './types';
import { interpretPlayerAction } from './actionInterpreter';
import { enterSimulationBoundary, exitSimulationBoundary } from './simulationBoundary';
import { resolveAction } from './resolveAction';

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
  roll: number = Math.floor(Math.random() * 100),
): PreparedPlayerAction {
  if (!gameState.character) throw new Error('Cannot resolve an action without a character.');

  const simulation = enterSimulationBoundary(gameState, [gameState.location]);
  const action = interpretPlayerAction(description, simulation, risk);
  const resolution = resolveAction(simulation, action, roll);
  const nextGameState = exitSimulationBoundary(gameState, resolution.state);

  return { resolution, nextGameState };
}
