import type { GameState } from '../types/game';
import type { SimulationState } from './types';
import { validateState } from './validateState';
import { createDefaultWuxiaCharacter } from './wuxia';
import { createDefaultJianghu } from './jianghu';

/** Transitional bridge from the legacy UI/save model to the authoritative simulation state. */
export function createSimulationState(gameState: GameState, knownLocationIds: string[] = []): SimulationState {
  if (!gameState.character) throw new Error('Cannot create a simulation state without a character.');

  const locationId = gameState.location.trim() || 'unknown';
  const locationIds = Array.from(new Set([locationId, ...knownLocationIds.filter(Boolean)]));
  const character = gameState.character;
  const maxQi = Math.max(0, character.stats.maxMana);
  const legacyWuxia = gameState.simulation?.character.wuxia;

  return {
    schemaVersion: 1,
    jianghu: gameState.simulation?.jianghu
      ? JSON.parse(JSON.stringify(gameState.simulation.jianghu))
      : createDefaultJianghu(locationId),
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
        constitution: character.stats.strength,
        perception: character.stats.agility,
        intelligence: character.stats.intelligence,
        charisma: character.stats.charisma,
        luck: character.stats.luck,
      },
      conditions: gameState.simulation?.character.conditions.map(condition => ({ ...condition })) ?? [],
      inventory: character.inventory.flatMap(item => Array(Math.max(0, item.quantity)).fill(item.id)),
      locationId,
      wuxia: legacyWuxia
        ? JSON.parse(JSON.stringify(legacyWuxia))
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
      knownFacts: gameState.simulation?.world.knownFacts ? [...gameState.simulation.world.knownFacts] : [],\n      knownRumorIds: gameState.simulation?.world.knownRumorIds ? [...gameState.simulation.world.knownRumorIds] : [],\n      knownNpcIds: gameState.simulation?.world.knownNpcIds ? [...gameState.simulation.world.knownNpcIds] : [],
    },
  };
}

function cloneSimulation(simulation: SimulationState): SimulationState {
  return {
    schemaVersion: 1,
    jianghu: simulation.jianghu ? JSON.parse(JSON.stringify(simulation.jianghu)) : undefined,
    character: {
      ...simulation.character,
      attributes: { ...simulation.character.attributes },
      conditions: simulation.character.conditions.map(condition => ({ ...condition })),
      inventory: [...simulation.character.inventory],
      ...(simulation.character.wuxia ? {
        wuxia: {
          ...simulation.character.wuxia,
          cultivation: { ...simulation.character.wuxia.cultivation },
          martialArts: simulation.character.wuxia.martialArts.map(art => ({
            ...art,
            techniques: art.techniques.map(technique => ({ ...technique })),
          })),
          injuries: simulation.character.wuxia.injuries.map(injury => ({ ...injury })),
          social: { ...simulation.character.wuxia.social },
        },
      } : {}),
    },
    world: {
      ...simulation.world,
      locationIds: [...simulation.world.locationIds],
      knownFacts: [...simulation.world.knownFacts],\n        knownRumorIds: [...(simulation.world.knownRumorIds ?? [])],\n        knownNpcIds: [...(simulation.world.knownNpcIds ?? [])],
    },
  };
}

export function mergeSimulationState(gameState: GameState, simulation: SimulationState): GameState {
  if (!gameState.character) return gameState;
  const cloned = cloneSimulation(simulation);

  return {
    ...gameState,
    character: {
      ...gameState.character,
      stats: {
        ...gameState.character.stats,
        currentHp: cloned.character.hp,
        currentMana: cloned.character.qi,
        maxMana: cloned.character.maxQi,
      },
    },
    location: cloned.character.locationId,
    turnCount: cloned.world.turn,
    simulation: cloned,
  };
}

export function ensureSimulationState(gameState: GameState, knownLocationIds: string[] = []): SimulationState {
  if (gameState.simulation && validateState(gameState.simulation).length === 0) {
    const simulation = cloneSimulation(gameState.simulation);
    simulation.world.locationIds = Array.from(new Set([
      ...simulation.world.locationIds,
      ...knownLocationIds.filter(Boolean),
    ]));
    return simulation;
  }
  return createSimulationState(gameState, knownLocationIds);
}

export function simulationStateToPromptContext(simulation: SimulationState): string {
  const c = simulation.character;
  const jianghu = simulation.jianghu;
  const nearbyNpcs = jianghu?.npcs
    .filter(npc => npc.alive && npc.locationId === c.locationId)
    .map(npc => npc.name)
    .join(', ') || 'none';
  const activeRumors = jianghu?.rumors
    .filter(rumor => rumor.currentLocationId === c.locationId)
    .map(rumor => rumor.text)
    .join(' | ') || 'none';

  return [
    `Simulation turn: ${simulation.world.turn}`,
    `Location: ${c.locationId}`,
    `HP: ${c.hp}/${c.maxHp}`,
    `Qi: ${c.qi}/${c.maxQi}`,
    `Fatigue: ${c.fatigue}/100`,
    `Nearby known people: ${nearbyNpcs}`,
    `Local rumors: ${activeRumors}`,
    `Known facts: ${simulation.world.knownFacts.join(', ') || 'none'}`,
  ].join('\n');
}
