import type { Character, GameChoice, InventoryItem } from '../../types/game';
import { LOCATIONS, TRAVEL_EDGES } from './locations';
import { NPC_PROFILES } from './jianghuSeed';
import { ORIGINS, type OriginProfile } from './origins';

export interface OriginOpening {
  narrative: string;
  choices: GameChoice[];
  location: string;
}

export function findOrigin(originId: string): OriginProfile | undefined {
  return ORIGINS.find(o => o.id === originId);
}

/** Authored scene-setting used as the demo/fallback opening and as the LLM's fixed scenario. */
export function buildOriginScenario(origin: OriginProfile): string {
  const place = LOCATIONS.find(l => l.id === origin.startLocationId);
  return [
    `Origin: ${origin.title}. ${origin.summary}`,
    place ? `Location: ${place.id}. ${place.summary}` : `Location: ${origin.startLocationId}.`,
    `Tension: ${origin.hook}`,
  ].join('\n');
}

/** The first scene and its five contextual choices, entirely from authored content. */
export function buildOriginOpening(origin: OriginProfile): OriginOpening {
  const place = LOCATIONS.find(l => l.id === origin.startLocationId);
  return {
    narrative: [
      `${origin.summary}`,
      place ? `You stand in ${place.id}. ${place.summary}` : '',
      origin.hook,
    ].filter(Boolean).join('\n\n'),
    choices: origin.openingChoices.map((c, i) => ({ id: i + 1, text: c.intent, risk: c.risk })),
    location: origin.startLocationId,
  };
}

/**
 * Legacy `Character` for the existing UI/save model. Legacy stats are on a
 * ~1-10 scale (engine attributes are ~10-centred), so they are halved. The
 * authoritative character lives in the SimulationState.
 */
export function createOriginCharacter(
  origin: OriginProfile,
  name: string,
  id: string,
  fantasyPreset: string,
): Character {
  const half = (v: number | undefined) => Math.max(1, Math.round((v ?? 10) / 2));
  const strength = half(origin.attributes.strength);
  const intelligence = half(origin.attributes.intelligence);
  const inventory: InventoryItem[] = origin.inventory.map((item, i) => ({
    id: `${id}-item-${i}`, name: item, type: 'misc', description: item, quantity: 1, value: 5,
  }));
  return {
    id,
    name: name.trim() || 'Wanderer',
    class: origin.title,
    race: 'Human',
    level: 1,
    experience: 0,
    stats: {
      strength,
      agility: half(origin.attributes.agility),
      intelligence,
      charisma: half(origin.attributes.charisma),
      luck: half(origin.attributes.luck),
      maxHp: 20 + strength * 2,
      currentHp: 20 + strength * 2,
      maxMana: 10 + intelligence * 2,
      currentMana: 10 + intelligence * 2,
    },
    skills: origin.arts.map(a => a.id),
    inventory,
    gold: 10,
    background: `${origin.summary} ${origin.hook}`,
    originId: origin.id,
    fantasyPreset,
  };
}

/** Presentation data the narrator digest needs; kept out of the engine on purpose. */
export function buildDigestOptions(): { npcVoices: Record<string, string>; locationNotes: Record<string, string> } {
  return {
    npcVoices: Object.fromEntries(NPC_PROFILES.map(p => [p.npc.id, p.voice])),
    locationNotes: Object.fromEntries(LOCATIONS.map(l => [
      l.id,
      `${l.summary} Observable features: ${l.features.join(', ')}. Hazards: ${l.hazards.join(', ')}.`,
    ])),
  };
}

/** Neighbours and features for the deterministic choice generator, from the authored map. */
export function buildChoiceContext() {
  return {
    neighbours: (locationId: string) => TRAVEL_EDGES
      .filter(e => e.a === locationId || e.b === locationId)
      .map(e => ({ id: e.a === locationId ? e.b : e.a, days: e.days })),
    features: (locationId: string) => LOCATIONS.find(l => l.id === locationId)?.features ?? [],
  };
}
