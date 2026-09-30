import type { GameState } from '../types/game';
import type { ActionResolution, RiskLevel } from './types';
import { interpretPlayerAction } from './actionInterpreter';
import { ensureSimulationState, mergeSimulationState } from './simulationAdapter';
import { resolveAction } from './resolveAction';

export interface PreparedPlayerAction {
  resolution: ActionResolution;
  nextGameState: GameState;
}

export function resolvePlayerAction(
  gameState: GameState,
  description: string,
  risk: RiskLevel = 'medium',
  roll: number = Math.floor(Math.random() * 100),
): PreparedPlayerAction {
  if (!gameState.character) throw new Error('Cannot resolve an action without a character.');

  const simulation = ensureSimulationState(gameState, [gameState.location]);
  const action = interpretPlayerAction(description, simulation, risk);
  const resolution = resolveAction(simulation, action, roll);
  const nextGameState = mergeSimulationState(gameState, resolution.state);

  return { resolution, nextGameState };
}
