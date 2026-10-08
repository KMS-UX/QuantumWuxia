import type { SimulationState } from '../../engine/types';
import { createDefaultWuxiaCharacter } from '../../engine/wuxia';
import { DEFAULT_FANTASY_PRESET, FANTASY_PRESETS, supernaturalEnabled, type FantasyLayerConfig } from './fantasyLayer';
import { createWuxiaJianghu, wuxiaLocationIds } from './jianghuSeed';
import { buildWorldMap } from './locations';
import { DEFAULT_CLOCK } from '../../engine/clock';
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
      clock: { ...DEFAULT_CLOCK, startTickOfDay: origin.startTickOfDay ?? DEFAULT_CLOCK.startTickOfDay },
      map: buildWorldMap(supernaturalEnabled(fantasy)),
    },
    jianghu: createWuxiaJianghu({ fantasy }),
    ledger: [],
  };
}

/**
 * Bring a game saved before the calendar existed up to date: it gets the calendar, the roads and
 * its NPCs' homes and routines. Idempotent, and it never touches anything the player has changed
 * (an NPC who already has a home or routine keeps it, so story relocations survive).
 */
export function upgradeWuxiaWorld(sim: SimulationState, fantasy: FantasyLayerConfig = FANTASY_PRESETS[DEFAULT_FANTASY_PRESET]): SimulationState {
  const next: SimulationState = JSON.parse(JSON.stringify(sim));
  next.world.clock ??= { ...DEFAULT_CLOCK };
  next.world.map ??= buildWorldMap(supernaturalEnabled(fantasy));
  const authored = createWuxiaJianghu({ fantasy });
  for (const npc of next.jianghu?.npcs ?? []) {
    const seed = authored.npcs.find(n => n.id === npc.id);
    if (!seed) continue;
    const unset = npc.homeId === undefined;
    npc.homeId ??= seed.homeId;
    // A relocated NPC (home changed by the story) keeps their new life; everyone else gets the authored routine.
    if (npc.routine === undefined && seed.routine && (unset || npc.homeId === seed.homeId)) npc.routine = seed.routine;
  }
  return next;
}
