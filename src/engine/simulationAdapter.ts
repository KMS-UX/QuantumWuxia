import type { GameState } from '../types/game';
import type { SimulationState } from './types';
import { validateState } from './validateState';
import { createDefaultWuxiaCharacter } from './wuxia';

/** Transitional bridge from the legacy UI/save model to Simulation Core v1. */
export function createSimulationState(gameState: GameState, knownLocationIds: string[] = []): SimulationState {
  if (!gameState.character) throw new Error('Cannot create a simulation state without a character.');

  const locationId = gameState.location.trim() || 'unknown';
  const locationIds = Array.from(new Set([locationId, ...knownLocationIds.filter(Boolean)]));
  const character = gameState.character;
  const maxQi = Math.max(0, character.stats.maxMana);

  return {
    schemaVersion: 1,
    character: {
      id: character.id,
      name: character.name,
      hp: character.stats.currentHp,
      maxHp: character.stats.maxHp,
      qi: Math.max(0, Math.min(maxQi, character.stats.currentMana)),
      maxQi,
      fatigue: gameState.simulation?.character.fatigue ?? 0,
      attributes: {
        strength: character.stats.strength,
        agility: character.stats.agility,
        // Explicit migration defaults for attributes absent from legacy saves.
        constitution: character.stats.strength,
        perception: character.stats.agility,
        intelligence: character.stats.intelligence,
        charisma: character.stats.charisma,
        luck: character.stats.luck,
      },
      conditions: gameState.simulation?.character.conditions.map(condition => ({ ...condition })) ?? [],
      inventory: character.inventory.flatMap(item => Array(Math.max(0, item.quantity)).fill(item.id)),
      locationId,
      wuxia: gameState.simulation?.character.wuxia
        ? gameState.simulation.character.wuxia
        : createDefaultWuxiaCharacter({
            id: character.id,
            name: character.name,
            hp: character.stats.currentHp,
            maxHp: character.stats.maxHp,
            qi: Math.max(0, Math.min(maxQi, character.stats.currentMana)),
            maxQi,
            fatigue: 0,
            attributes: {
              strength: character.stats.strength,
              agility: character.stats.agility,
              constitution: character.stats.strength,
              perception: character.stats.agility,
              intelligence: character.stats.intelligence,
              charisma: character.stats.charisma,
              luck: character.stats.luck,
            },
            conditions: [],
            inventory: [],
            locationId,
          }).wuxia,
    },
    world: {
      turn: gameState.turnCount,
      locationIds,
      knownFacts: gameState.simulation?.world.knownFacts ? [...gameState.simulation.world.knownFacts] : [],
    },
  };
}

export function mergeSimulationState(gameState: GameState, simulation: SimulationState): GameState {
  if (!gameState.character) return gameState;

  return {
    ...gameState,
    character: {
      ...gameState.character,
      stats: {
        ...gameState.character.stats,
        currentHp: simulation.character.hp,
        currentMana: simulation.character.qi,
        maxMana: simulation.character.maxQi,
      },
    },
    location: simulation.character.locationId,
    turnCount: simulation.world.turn,
    simulation: {
      schemaVersion: 1,
      character: {
        ...simulation.character,
        attributes: { ...simulation.character.attributes },
        conditions: simulation.character.conditions.map(condition => ({ ...condition })),
        inventory: [...simulation.character.inventory],
      },
      world: {
        ...simulation.world,
        locationIds: [...simulation.world.locationIds],
        knownFacts: [...simulation.world.knownFacts],
      },
    },
  };
}

export function ensureSimulationState(gameState: GameState, knownLocationIds: string[] = []): SimulationState {
  if (gameState.simulation && validateState(gameState.simulation).length === 0) {
    return {
      schemaVersion: 1,
      character: {
        ...gameState.simulation.character,
        attributes: { ...gameState.simulation.character.attributes },
        conditions: gameState.simulation.character.conditions.map(condition => ({ ...condition })),
        inventory: [...gameState.simulation.character.inventory],
        ...(gameState.simulation.character.wuxia ? {
          wuxia: {
            ...gameState.simulation.character.wuxia,
            cultivation: { ...gameState.simulation.character.wuxia.cultivation },
            martialArts: gameState.simulation.character.wuxia.martialArts.map(art => ({
              ...art,
              techniques: art.techniques.map(technique => ({ ...technique })),
            })),
            injuries: gameState.simulation.character.wuxia.injuries.map(injury => ({ ...injury })),
            social: { ...gameState.simulation.character.wuxia.social },
          },
        } : {}),
      },
      world: {
        ...gameState.simulation.world,
        locationIds: Array.from(new Set([
          ...gameState.simulation.world.locationIds,
          ...knownLocationIds.filter(Boolean),
        ])),
        knownFacts: [...gameState.simulation.world.knownFacts],
      },
    };
  }
  return createSimulationState(gameState, knownLocationIds);
}

export function simulationStateToPromptContext(simulation: SimulationState): string {
  const c = simulation.character;
  return [
    `Simulation turn: ${simulation.world.turn}`,
    `Location: ${c.locationId}`,
    `HP: ${c.hp}/${c.maxHp}`,
    `Qi: ${c.qi}/${c.maxQi}`,
    `Fatigue: ${c.fatigue}/100`,
    `Known facts: ${simulation.world.knownFacts.join(', ') || 'none'}`,
  ].join('\n');
}
