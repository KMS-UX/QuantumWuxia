import type { Character } from '../types/game';
import type { SimulationState, SimCharacter } from './types';
import { createDefaultWuxiaCharacter } from './wuxia';
import { createDefaultJianghu } from './jianghu';

export const LEGACY_ATTRIBUTE_MIGRATION = {
  constitution: 'strength',
  perception: 'agility',
  qi: 'currentMana',
  maxQi: 'maxMana',
} as const;

/**
 * Compatibility-only migration from the legacy GameState character model.
 *
 * These mappings are not canonical gameplay semantics. They exist only for
 * saves that predate SimulationState. Once a SimulationState exists, its
 * attributes and Qi values must be preserved as authoritative data.
 */
export function migrateLegacyCharacter(
  character: Character,
  locationId: string,
): SimCharacter {
  const maxQi = Math.max(0, character.stats.maxMana);
  const qi = Math.max(0, Math.min(maxQi, character.stats.currentMana));

  return {
    id: character.id,
    name: character.name,
    hp: character.stats.currentHp,
    maxHp: character.stats.maxHp,
    qi,
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
    inventory: character.inventory.flatMap(item =>
      Array(Math.max(0, item.quantity)).fill(item.id),
    ),
    locationId,
  };
}

export function migrateLegacyGameState(
  character: Character,
  locationId: string,
  turn: number,
  knownLocationIds: string[] = [],
): SimulationState {
  const simulationCharacter = migrateLegacyCharacter(character, locationId);

  return {
    schemaVersion: 1,
    ledger: [],
    jianghu: createDefaultJianghu(locationId),
    character: {
      ...simulationCharacter,
      wuxia: createDefaultWuxiaCharacter(simulationCharacter).wuxia,
    },
    world: {
      turn,
      locationIds: Array.from(new Set([locationId, ...knownLocationIds.filter(Boolean)])),
      knownFacts: [],
      knownRumorIds: [],
      knownNpcIds: [],
    },
  };
}
