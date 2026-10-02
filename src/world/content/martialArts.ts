import type { MartialArt } from '../../engine/wuxia';

/**
 * Martial art catalog. `art` is a template at mastery 0 that conforms to the
 * engine's `MartialArt`; the surrounding profile carries the design data the
 * Game Bible (§6) requires but the engine type does not yet model.
 */
export interface MartialArtProfile {
  art: MartialArt;
  zh: string;
  lineage: string;
  /** Prerequisites to learn (attribute / art / stage). Not yet enforced by the engine. */
  requirements: string[];
  teacherNpcId?: string;
  strongAgainst: string[];
  counteredBy: string[];
  /** The price or risk of practice, for narration and future resolver rules. */
  risk: string;
  fantasy?: boolean;
}

const tech = (id: string, name: string, description: string, qiCost: number) =>
  ({ id, name, description, qiCost, mastery: 0 });

export const MARTIAL_ARTS: MartialArtProfile[] = [
  {
    zh: '碧江劍法', lineage: 'Jade Hall (orthodox)',
    requirements: ['agility >= 8', 'sword in hand'], teacherNpcId: 'npc-bai-qingshan',
    strongAgainst: ['saber styles', 'single-weapon fighters'], counteredBy: ['Iron Mountain Palm (crushes the blade\'s tempo)'],
    risk: 'The final volume demands a calm heart; anger causes Qi deviation.',
    art: {
      id: 'art-azure-river-sword', name: 'Azure River Sword', type: 'sword', origin: 'Jade Hall', rank: 3, mastery: 0,
      techniques: [
        tech('tech-ripple-parry', 'Ripple Parry', 'A circular deflection that turns a strike into a stumble.', 2),
        tech('tech-current-thrust', 'Current-Cutting Thrust', 'A long, committed lunge; strong reach, poor recovery.', 5),
        tech('tech-whirlpool-bind', 'Whirlpool Bind', 'Spins the opponent\'s weapon off-line; needs mastery 40+.', 8),
      ],
      compatibleArts: ['art-swallow-skimming-steps', 'art-nine-bell-breathing'],
      incompatibleArts: ['art-crimson-lotus-needles'],
      weaknesses: ['heavy blunt weapons', 'cramped corridors'],
    },
  },
  {
    zh: '九鈴吐納', lineage: 'Ninefold Monastery',
    requirements: ['willingness to take a vow of restraint', 'no active internal injury'], teacherNpcId: 'npc-abbot-huiyuan',
    strongAgainst: ['poison', 'Qi disruption', 'exhaustion'], counteredBy: ['sudden overwhelming force before the breath settles'],
    risk: 'Slow to advance; each bottleneck demands a month of enforced stillness.',
    art: {
      id: 'art-nine-bell-breathing', name: 'Nine-Bell Breathing Method', type: 'internal', origin: 'Ninefold Monastery', rank: 4, mastery: 0,
      techniques: [
        tech('tech-first-bell', 'First Bell: Settling Breath', 'Recovers Qi faster and steadies the mind.', 0),
        tech('tech-fourth-bell', 'Fourth Bell: Diamond Resonance', 'Hardens the body against a single blow.', 10),
        tech('tech-ninth-bell', 'Ninth Bell: Vow of Stillness', 'Total calm; enormous benefit, but the user cannot attack that turn.', 15),
      ],
      compatibleArts: ['art-azure-river-sword', 'art-heart-sutra-touch', 'art-iron-mountain-palm'],
      incompatibleArts: ['art-crimson-lotus-needles', 'art-foxfire-steps'],
      weaknesses: ['slow to start in a fight'],
    },
  },
  {
    zh: '鐵山掌', lineage: 'Black River Brotherhood (street) / Frostbell garrison (drill)',
    requirements: ['strength >= 10', 'constitution >= 9'],
    strongAgainst: ['unarmored opponents', 'blade-dependent fighters'], counteredBy: ['qinggong kiting', 'poisoned needles'],
    risk: 'Unconditioned hands split; heavy use without treatment leaves lasting arm injuries.',
    art: {
      id: 'art-iron-mountain-palm', name: 'Iron Mountain Palm', type: 'palm', origin: 'Frostbell Pass', rank: 2, mastery: 0,
      techniques: [
        tech('tech-mountain-press', 'Mountain Press', 'A slow, immovable push that breaks guard.', 4),
        tech('tech-rockfall-strike', 'Rockfall Strike', 'Overhead hammer-palm; devastating if it lands.', 7),
      ],
      compatibleArts: ['art-nine-bell-breathing'],
      weaknesses: ['agile opponents', 'ranged attacks'],
    },
  },
  {
    zh: '掠燕步', lineage: 'Cloudstep Peak hermits',
    requirements: ['agility >= 10', 'no leg injury above severity 2'],
    strongAgainst: ['slow heavy fighters', 'pursuit across rough terrain'], counteredBy: ['hidden weapons', 'enclosed spaces'],
    risk: 'Overuse drains Qi and exposes the user mid-air.',
    art: {
      id: 'art-swallow-skimming-steps', name: 'Swallow-Skimming Steps', type: 'qinqong', origin: 'Cloudstep Peak', rank: 2, mastery: 0,
      techniques: [
        tech('tech-wall-run', 'Wall Run', 'Cross walls and rooftops; needs a leg in good condition.', 3),
        tech('tech-feather-fall', 'Feather Fall', 'Survive a drop that would otherwise injure.', 4),
      ],
      compatibleArts: ['art-azure-river-sword', 'art-willow-leaf-saber'],
      weaknesses: ['broken or damaged legs', 'pinned in narrow spaces'],
    },
  },
  {
    zh: '赤蓮針', lineage: 'Crimson Lotus Society (heterodox)',
    requirements: ['perception >= 10', 'steady hands', 'knowledge: poison'], teacherNpcId: 'npc-lian-xiaoyue',
    strongAgainst: ['armored fighters', 'groups (with prepared needles)'], counteredBy: ['Nine-Bell Breathing (resists the venom)', 'shields'],
    risk: 'Handling poison without antidote knowledge is a gamble with your own life; orthodox sects shun its users.',
    art: {
      id: 'art-crimson-lotus-needles', name: 'Crimson Lotus Needle Art', type: 'hidden_weapon', origin: 'Crimson Lotus Society', rank: 3, mastery: 0,
      techniques: [
        tech('tech-petal-volley', 'Petal Volley', 'A fan of needles; hard to dodge, easy to deflect with a wide guard.', 3),
        tech('tech-lotus-sting', 'Lotus Sting', 'A single needle at a nerve point; paired with poison.', 6),
      ],
      incompatibleArts: ['art-azure-river-sword', 'art-nine-bell-breathing'],
      weaknesses: ['limited needle supply', 'reputation damage with orthodox sects'],
    },
  },
  {
    zh: '柳葉刀', lineage: 'Willow Market guild guards',
    requirements: ['agility >= 8'],
    strongAgainst: ['crowds', 'unarmored opponents'], counteredBy: ['Azure River Sword (superior reach)'],
    risk: 'Cheap and common; its users rarely earn respect without a signature technique.',
    art: {
      id: 'art-willow-leaf-saber', name: 'Willow Leaf Saber', type: 'saber', origin: 'Willow Market Town', rank: 1, mastery: 0,
      techniques: [
        tech('tech-willow-slash', 'Willow Slash', 'Fast, flexible cuts that favor numbers and flanking.', 1),
        tech('tech-wind-bend', 'Bend in the Wind', 'Yield and counter; strong in a crowd.', 3),
      ],
      compatibleArts: ['art-swallow-skimming-steps'],
      weaknesses: ['armor', 'long weapons'],
    },
  },
  {
    zh: '心經推脈', lineage: 'Ninefold Monastery infirmary',
    requirements: ['intelligence >= 10', 'steady hands'], teacherNpcId: 'npc-yun-shuang',
    strongAgainst: ['internal injury', 'meridian damage'], counteredBy: [],
    risk: 'A failed treatment can worsen the injury; healers carry the weight of every patient.',
    art: {
      id: 'art-heart-sutra-touch', name: 'Heart-Sutra Healing Touch', type: 'medicine', origin: 'Ninefold Monastery', rank: 3, mastery: 0,
      techniques: [
        tech('tech-pulse-reading', 'Pulse Reading', 'Reveals hidden injuries and poison.', 1),
        tech('tech-meridian-push', 'Meridian Push', 'Clears blocked Qi; heals internal injury over time.', 8),
      ],
      compatibleArts: ['art-nine-bell-breathing'],
      weaknesses: ['useless in direct combat'],
    },
  },
  {
    zh: '霜鈴槍', lineage: 'Frostbell Garrison',
    requirements: ['strength >= 9', 'constitution >= 9'],
    strongAgainst: ['cavalry', 'charges', 'melee with shorter weapons'], counteredBy: ['close-in fighters who slip past the point'],
    risk: 'Regimented; its drills mark the user as imperial-trained.',
    art: {
      id: 'art-frostbell-spear', name: 'Frostbell Spear', type: 'spear', origin: 'Frostbell Pass', rank: 3, mastery: 0,
      techniques: [
        tech('tech-ringing-line', 'Ringing Line', 'A defensive sweep; keeps enemies at point range.', 2),
        tech('tech-icefall-thrust', 'Icefall Thrust', 'A long straight thrust that punishes a charge.', 6),
      ],
      compatibleArts: ['art-iron-mountain-palm'],
      weaknesses: ['indoor fights', 'close-range grappling'],
    },
  },
  {
    zh: '狐火幻步', lineage: 'Moonwell Grove (spirit tradition — not Qi cultivation)',
    requirements: ['supernatural layer enabled', 'a spirit patron or sacred site'], fantasy: true,
    strongAgainst: ['pursuers', 'crowds', 'those relying on sight'], counteredBy: ['iron talismans', 'Nine-Bell Breathing (steadies the mind)'],
    risk: 'Every use costs time: hours vanish, and the user may not remember them.',
    art: {
      id: 'art-foxfire-steps', name: 'Foxfire Illusion Steps', type: 'other', origin: 'Moonwell Grove', rank: 4, mastery: 0,
      techniques: [
        tech('tech-false-trail', 'False Trail', 'Leaves afterimages; pursuers lose track.', 4),
        tech('tech-lantern-veil', 'Lantern Veil', 'Clouds perception in a small area; costs lost time.', 9),
      ],
      incompatibleArts: ['art-nine-bell-breathing'],
      weaknesses: ['iron', 'bell sounds', 'steady-minded opponents'],
    },
  },
];

/**
 * Structured style relationships (the prose `strongAgainst` / `counteredBy` above is flavour for
 * the narrator; these ids are what the combat rules read). Authored in pairs so a counter is
 * felt from both sides.
 */
const STYLE_EDGES: Record<string, { strongAgainst: string[]; counteredBy: string[] }> = {
  'art-azure-river-sword': { strongAgainst: ['art-willow-leaf-saber'], counteredBy: ['art-iron-mountain-palm'] },
  'art-iron-mountain-palm': { strongAgainst: ['art-azure-river-sword', 'art-willow-leaf-saber', 'art-frostbell-spear'], counteredBy: ['art-swallow-skimming-steps', 'art-crimson-lotus-needles'] },
  'art-crimson-lotus-needles': { strongAgainst: ['art-iron-mountain-palm'], counteredBy: ['art-nine-bell-breathing'] },
  'art-nine-bell-breathing': { strongAgainst: ['art-crimson-lotus-needles', 'art-foxfire-steps'], counteredBy: [] },
  'art-willow-leaf-saber': { strongAgainst: [], counteredBy: ['art-azure-river-sword', 'art-iron-mountain-palm', 'art-frostbell-spear'] },
  'art-frostbell-spear': { strongAgainst: ['art-willow-leaf-saber'], counteredBy: ['art-iron-mountain-palm'] },
  'art-swallow-skimming-steps': { strongAgainst: ['art-iron-mountain-palm'], counteredBy: [] },
  'art-foxfire-steps': { strongAgainst: [], counteredBy: ['art-nine-bell-breathing'] },
};
/** Parent-art mastery a technique needs before it can be used (enforced by the resolver). */
const TECHNIQUE_REQUIREMENTS: Record<string, number> = {
  'tech-whirlpool-bind': 40, 'tech-ninth-bell': 50, 'tech-lantern-veil': 30,
  'tech-rockfall-strike': 25, 'tech-icefall-thrust': 30, 'tech-meridian-push': 30, 'tech-lotus-sting': 25,
};
for (const profile of MARTIAL_ARTS) {
  const edges = STYLE_EDGES[profile.art.id];
  if (edges) { profile.art.strongAgainstArts = edges.strongAgainst; profile.art.counteredByArts = edges.counteredBy; }
  for (const t of profile.art.techniques) if (TECHNIQUE_REQUIREMENTS[t.id] !== undefined) t.minMastery = TECHNIQUE_REQUIREMENTS[t.id];
}

export const ARTS_BY_ID: Record<string, MartialArtProfile> = Object.fromEntries(
  MARTIAL_ARTS.map(profile => [profile.art.id, profile]),
);

export function artsFor(includeFantasy: boolean): MartialArtProfile[] {
  return MARTIAL_ARTS.filter(profile => includeFantasy || !profile.fantasy);
}

/** A fresh, independent copy of a catalog art at the given mastery (0..100). */
export function instantiateArt(id: string, mastery = 0): MartialArt {
  const profile = ARTS_BY_ID[id];
  if (!profile) throw new Error(`Unknown martial art: ${id}`);
  const clamped = Math.max(0, Math.min(100, mastery));
  return {
    ...profile.art,
    mastery: clamped,
    techniques: profile.art.techniques.map(t => ({ ...t, mastery: Math.floor(clamped / 2) })),
    strongAgainstArts: profile.art.strongAgainstArts ? [...profile.art.strongAgainstArts] : undefined,
    counteredByArts: profile.art.counteredByArts ? [...profile.art.counteredByArts] : undefined,
    compatibleArts: profile.art.compatibleArts ? [...profile.art.compatibleArts] : undefined,
    incompatibleArts: profile.art.incompatibleArts ? [...profile.art.incompatibleArts] : undefined,
    weaknesses: profile.art.weaknesses ? [...profile.art.weaknesses] : undefined,
  };
}
