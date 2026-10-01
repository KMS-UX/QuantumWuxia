/**
 * Optional fantasy layer declaration (Game Bible §3: "Each setting should
 * declare what is possible, rare, forbidden, or impossible").
 */
export type MagicLevel = 'none' | 'hidden' | 'rare' | 'common';

export interface FantasyLayerConfig {
  id: string;
  magicLevel: MagicLevel;
  /** Supernatural elements that may appear in this campaign. */
  possible: string[];
  /** Elements that exist but are scarce, secret, or dangerous. */
  rare: string[];
  /** Elements that never appear, regardless of what narration wants. */
  impossible: string[];
  /** Design rules the narrator and world-event proposer must respect. */
  rules: string[];
}

export const FANTASY_PRESETS: Record<'pure_wuxia' | 'hidden_arcana' | 'living_legends', FantasyLayerConfig> = {
  pure_wuxia: {
    id: 'pure_wuxia', magicLevel: 'none',
    possible: [], rare: [],
    impossible: ['spirits', 'demons', 'divine intervention', 'magical relics', 'transformation'],
    rules: ['Apparent miracles are always martial skill, trickery, poison, or superstition.'],
  },
  hidden_arcana: {
    id: 'hidden_arcana', magicLevel: 'hidden',
    possible: ['illusion arts', 'cursed texts'],
    rare: ['spirit-touched places', 'beast spirits in human form'],
    impossible: ['gods acting openly', 'resurrection', 'spellcasting as a mainstream profession'],
    rules: [
      'Most people doubt the supernatural; proof is rare and always costly.',
      'Supernatural abilities are separate traditions and never reuse Qi cultivation rules.',
    ],
  },
  living_legends: {
    id: 'living_legends', magicLevel: 'rare',
    possible: ['spirit arts', 'beast spirits', 'cursed or blessed relics', 'ghosts', 'moonwell visions'],
    rare: ['fox spirits', 'immortal hermits', 'sealed demons'],
    impossible: ['instant healing', 'mind control of the player', 'gods overriding simulation results'],
    rules: [
      'Supernatural effects are resolved by the same deterministic simulation as martial ones.',
      'Every supernatural power has a price: lost time, memory, face, or years.',
      'Qi is not mana; spirit arts are a distinct tradition with their own requirements.',
    ],
  },
};

export const DEFAULT_FANTASY_PRESET = 'living_legends' as const;

export function supernaturalEnabled(config: FantasyLayerConfig): boolean {
  return config.magicLevel !== 'none';
}
