import type { GameState } from '../types/game';
import type { SimulationState } from './types';
import { ensureSimulationState, mergeSimulationState } from './simulationAdapter';
import { validateState } from './validateState';

/**
 * Canonical simulation boundary.
 *
 * GameState remains the UI/save compatibility model during migration.
 * SimulationState is the authoritative model for all deterministic gameplay
 * resolution. Code outside the engine should cross this boundary rather than
 * mutating simulation state directly.
 */

export function enterSimulationBoundary(
  gameState: GameState,
  knownLocationIds: string[] = [],
): SimulationState {
  const simulation = ensureSimulationState(gameState, knownLocationIds);
  const issues = validateState(simulation);
  if (issues.length > 0) {
    throw new Error(
      `Cannot enter simulation boundary: ${issues.map(i => `${i.path}: ${i.message}`).join('; ')}`,
    );
  }
  return simulation;
}

export function exitSimulationBoundary(
  gameState: GameState,
  simulation: SimulationState,
): GameState {
  const issues = validateState(simulation);
  if (issues.length > 0) {
    throw new Error(
      `Cannot commit simulation state: ${issues.map(i => `${i.path}: ${i.message}`).join('; ')}`,
    );
  }
  return mergeSimulationState(gameState, simulation);
}
