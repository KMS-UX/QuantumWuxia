import type { SimulationState } from '../../engine/types';
import { createDefaultWuxiaCharacter } from '../../engine/wuxia';
import { DEFAULT_FANTASY_PRESET, FANTASY_PRESETS, supernaturalEnabled, type FantasyLayerConfig } from './fantasyLayer';
import { createWuxiaJianghu, wuxiaLocationIds } from './jianghuSeed';
import { instantiateArt } from './martialArts';
import { ORIGINS, originsFor } from './origins';

export * from './fantasyLayer';
export * from './finales';
export * from './jianghuSeed';
export * from './locations';
export * from './martialArts';
export * from './opening';
export * from './origins';

const BASE_ATTRIBUTE = 10;

/**
 * Build a complete, valid starting `SimulationState` for an origin, purely from
 * authored content. This does not touch the legacy `GameState`; wiring it into
 * character creation is a separate adapter decision.
 */
export function createWuxiaSimulation(
  originId: string,
  fantasy: FantasyLayerConfig = FANTASY_PRESETS[DEFAULT_FANTASY_PRESET],
  characterName = 'Wanderer',
  /** Seed for replayable rolls. Fixed by default so content tests are deterministic; the store passes a random one. */
  seed = 1,
): SimulationState {
  const origin = originsFor(supernaturalEnabled(fantasy)).find(o => o.id === originId);
  if (!origin) {
    throw new Error(`Origin "${originId}" is unknown or requires the supernatural layer: ${ORIGINS.map(o => o.id).join(', ')}`);
  }

  const base = {
    id: 'player',
    name: characterName,
    hp: 100, maxHp: 100, qi: 40, maxQi: 60, fatigue: 0,
    attributes: {
      strength: BASE_ATTRIBUTE, agility: BASE_ATTRIBUTE, constitution: BASE_ATTRIBUTE, perception: BASE_ATTRIBUTE,
      intelligence: BASE_ATTRIBUTE, charisma: BASE_ATTRIBUTE, luck: BASE_ATTRIBUTE, ...origin.attributes,
    },
    conditions: [],
    inventory: [...origin.inventory],
    locationId: origin.startLocationId,
  };
  const character = createDefaultWuxiaCharacter(base);
  character.wuxia.martialArts = origin.arts.map(a => instantiateArt(a.id, a.mastery));

  return {
    schemaVersion: 1,
    character,
    world: {
      turn: 0,
      locationIds: wuxiaLocationIds(fantasy),
      knownFacts: [],
      knownRumorIds: [],
      knownNpcIds: [],
      rng: { seed: seed >>> 0, draws: 0 },
    },
    jianghu: createWuxiaJianghu({ fantasy }),
    ledger: [],
  };
}
