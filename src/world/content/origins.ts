import type { RiskLevel } from '../../engine/types';

export interface OpeningChoice {
  /** Short button label. */
  label: string;
  /** Free-text intent the player would otherwise type; goes through the intent interpreter. */
  intent: string;
  risk: RiskLevel;
}

export interface OriginProfile {
  id: string;
  title: string;
  zh: string;
  summary: string;
  startLocationId: string;
  attributes: Partial<Record<'strength' | 'agility' | 'constitution' | 'perception' | 'intelligence' | 'charisma' | 'luck', number>>;
  arts: Array<{ id: string; mastery: number }>;
  inventory: string[];
  /** The authored tension this origin walks into; the simulation, not the author, decides what follows. */
  hook: string;
  /** Five contextual suggestions (Game Bible §12) for the first scene. */
  openingChoices: OpeningChoice[];
  fantasy?: boolean;
}

export const ORIGINS: OriginProfile[] = [
  {
    id: 'origin-wandering-physician', title: 'Wandering Physician', zh: '遊醫',
    summary: 'You carry a medicine chest and a reputation for not asking whose side a patient is on.',
    startLocationId: 'Willow Market Town',
    attributes: { intelligence: 14, perception: 12, strength: 8 },
    arts: [{ id: 'art-heart-sutra-touch', mastery: 25 }],
    inventory: ['medicine chest', 'silver needles'],
    hook: 'Fever season is draining the town\'s medicine just as marsh herbs become dangerous to fetch.',
    openingChoices: [
      { label: 'Offer your services', intent: 'Ask Madam Yun Shuang if the infirmary needs another healer', risk: 'low' },
      { label: 'Check the herb stalls', intent: 'Inspect the herb stalls to see what is scarce', risk: 'low' },
      { label: 'Listen to the gossip', intent: 'Talk to Ah Lin to learn what the market is whispering', risk: 'medium' },
      { label: 'Plan a marsh trip', intent: 'Travel to Blackwater Marsh to gather rare herbs', risk: 'high' },
      { label: 'Treat quietly', intent: 'Rest and tend to patients carefully in the market square', risk: 'low' },
    ],
  },
  {
    id: 'origin-disgraced-disciple', title: 'Disgraced Disciple', zh: '逐門弟子',
    summary: 'Jade Hall taught you the Azure River Sword, then cast you out. You still know where the Hall keeps its secrets.',
    startLocationId: 'The Crossroads',
    attributes: { agility: 13, charisma: 8, strength: 11 },
    arts: [{ id: 'art-azure-river-sword', mastery: 22 }],
    inventory: ['plain sword', 'expulsion token'],
    hook: 'The Hall\'s final sword volume is missing, and a disciple with your history is the obvious suspect.',
    openingChoices: [
      { label: 'Ask the tea keeper', intent: 'Talk to the Old Tea Keeper to hear what the Hall is saying about me', risk: 'low' },
      { label: 'Approach the swordsman', intent: 'Talk to the Wandering Swordsman about the missing volume', risk: 'medium' },
      { label: 'Go to Jade Hall', intent: 'Travel to Jade Hall to confront Elder Bai and clear my name', risk: 'high' },
      { label: 'Read the notice wall', intent: 'Inspect the notice wall for news of the Hall', risk: 'low' },
      { label: 'Lie low', intent: 'Rest quietly at the tea house and watch who passes', risk: 'low' },
    ],
  },
  {
    id: 'origin-escort-apprentice', title: 'Escort Apprentice', zh: '鏢局學徒',
    summary: 'You guard guild caravans with a saber you can barely afford to lose.',
    startLocationId: 'Lantern Ferry',
    attributes: { constitution: 12, strength: 11 },
    arts: [{ id: 'art-willow-leaf-saber', mastery: 28 }],
    inventory: ['saber', 'guild escort token'],
    hook: 'The toll dispute has stranded your caravan at the ferry, and both sides want an escort on their side.',
    openingChoices: [
      { label: 'Negotiate the toll', intent: 'Talk to Captain Ma Tie about the toll', risk: 'medium' },
      { label: 'Look for a bypass', intent: 'Inspect the lantern pier for another crossing', risk: 'low' },
      { label: 'Sell your services', intent: 'Talk to the Jade Hall couriers about escort work', risk: 'medium' },
      { label: 'Stand firm', intent: 'Attack no one but openly guard the caravan at the toll house', risk: 'medium' },
      { label: 'Rest and wait', intent: 'Rest with the caravan until tempers cool', risk: 'low' },
    ],
  },
  {
    id: 'origin-ferry-orphan', title: 'Ferry Orphan', zh: '渡口孤兒',
    summary: 'Raised on the river by people who owed nobody and told you nothing about your parents.',
    startLocationId: 'Lantern Ferry',
    attributes: { agility: 13, luck: 14, charisma: 11 },
    arts: [{ id: 'art-swallow-skimming-steps', mastery: 15 }],
    inventory: ['river knife', 'a child\'s jade charm'],
    hook: 'The charm you were found with is the same pattern an old sect crest once used.',
    openingChoices: [
      { label: 'Ask Captain Ma', intent: 'Talk to Captain Ma Tie about where the charm might be from', risk: 'medium' },
      { label: 'Listen to the singer', intent: 'Talk to Su Mian, the ferry singer, about old songs', risk: 'low' },
      { label: 'Study the charm', intent: 'Inspect the charm closely for markings', risk: 'low' },
      { label: 'Visit Willow Market', intent: 'Travel to Willow Market Town to find someone who knows crests', risk: 'medium' },
      { label: 'Keep it hidden', intent: 'Sneak away from the pier before anyone sees the charm', risk: 'medium' },
    ],
  },
  {
    id: 'origin-frontier-deserter', title: 'Frontier Deserter', zh: '逃兵',
    summary: 'You ran from the Frostbell garrison with a spear and a secret about the winter grain.',
    startLocationId: 'Frostbell Pass',
    attributes: { strength: 13, constitution: 13, luck: 6 },
    arts: [{ id: 'art-frostbell-spear', mastery: 30 }],
    inventory: ['spear', 'torn garrison cloak'],
    hook: 'Marshal Zhao knows you saw the granary books, and he cannot let you cross the pass.',
    openingChoices: [
      { label: 'Slip out at dusk', intent: 'Sneak past the garrison gate at dusk', risk: 'high' },
      { label: 'Bargain with Zhao', intent: 'Talk to Marshal Zhao Rong and offer silence for passage', risk: 'high' },
      { label: 'Hide among traders', intent: 'Sneak among the border traders heading south', risk: 'medium' },
      { label: 'Check the granary', intent: 'Inspect the granary for proof of the skimming', risk: 'medium' },
      { label: 'Head to the Crossroads', intent: 'Travel to The Crossroads before the garrison notices', risk: 'medium' },
    ],
  },
  {
    id: 'origin-relic-bearer', title: 'Bearer of the Silver Scroll', zh: '持卷人',
    summary: 'A scroll that is blank in sunlight and legible by moonlight chose you, or you stole it. You are no longer sure which.',
    startLocationId: 'The Crossroads', fantasy: true,
    attributes: { perception: 13, intelligence: 12, luck: 12 },
    arts: [{ id: 'art-foxfire-steps', mastery: 10 }],
    inventory: ['silver-edged scroll'],
    hook: 'Something is following the scroll, and a ferry singer seems to know your name.',
    openingChoices: [
      { label: 'Read it by moonlight', intent: 'Inspect the scroll carefully once night falls', risk: 'high' },
      { label: 'Find the singer', intent: 'Travel to Lantern Ferry to find Su Mian', risk: 'medium' },
      { label: 'Ask the tea keeper', intent: 'Talk to the Old Tea Keeper about strange scrolls', risk: 'low' },
      { label: 'Seek the monastery', intent: 'Travel to Ninefold Monastery to find someone who can read it', risk: 'medium' },
      { label: 'Meditate on it', intent: 'Meditate quietly to steady my mind and sense the scroll', risk: 'medium' },
    ],
  },
];

export function originsFor(includeFantasy: boolean): OriginProfile[] {
  return ORIGINS.filter(o => includeFantasy || !o.fantasy);
}
