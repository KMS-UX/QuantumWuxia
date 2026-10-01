import type {
  FactionRelationState, FactionState, JianghuState, MarketState, NPCState,
  ObligationState, RelationshipState, RumorState, WorldEventState,
} from '../../engine/jianghu';
import { DEFAULT_FANTASY_PRESET, FANTASY_PRESETS, supernaturalEnabled, type FantasyLayerConfig } from './fantasyLayer';
import { locationsFor } from './locations';

/** Presentation/dialogue data kept beside (never inside) the authoritative NPCState. */
export interface NpcProfile {
  npc: NPCState;
  zh: string;
  appearance: string;
  /** Guidance for the NPC-dialogue contract (Game Bible §13): how this person talks. */
  voice: string;
  fantasy?: boolean;
}

const goal = (id: string, kind: NPCState['goals'][number]['kind'], description: string, priority: number, targetId?: string) =>
  ({ id, kind, description, priority, progress: 0, active: true, ...(targetId ? { targetId } : {}) });

const npc = (partial: Omit<NPCState, 'disposition' | 'memories' | 'alive'> & { disposition?: number }): NPCState =>
  ({ disposition: 0, memories: [], alive: true, ...partial });

export const FACTIONS: FactionState[] = [
  { id: 'faction-jade-hall', name: 'Jade Hall', type: 'sect',
    description: 'An orthodox sword sect that prizes reputation, sworn oaths, and the Azure River Sword. Its aging master has not named an heir.',
    territory: ['Jade Hall', 'Cloudstep Peak'], resources: 60, influence: 45, goals: ['protect travelers', 'preserve martial traditions', 'settle succession'],
    allies: ['faction-ninefold'], enemies: ['faction-crimson-lotus'], internalTension: 25, playerReputation: 0 },
  { id: 'faction-black-river', name: 'Black River Brotherhood', type: 'guild',
    description: 'Smugglers, informants and river pilots who run Lantern Ferry. They keep their word to those who pay.',
    territory: ['Lantern Ferry'], resources: 55, influence: 35, goals: ['control river trade', 'collect debts', 'buy off the garrison'],
    allies: [], enemies: [], internalTension: 20, playerReputation: 0 },
  { id: 'faction-ninefold', name: 'Ninefold Monastery', type: 'religious',
    description: 'A neutral monastery of internal-arts masters and healers. Guards a sealed ninth courtyard no outsider has seen.',
    territory: ['Ninefold Monastery'], resources: 50, influence: 40, goals: ['heal the wounded', 'guard the ninth courtyard', 'remain neutral'],
    allies: ['faction-jade-hall'], enemies: [], internalTension: 10, playerReputation: 0 },
  { id: 'faction-crimson-lotus', name: 'Crimson Lotus Society', type: 'sect',
    description: 'A heterodox sect of poisoners and needle-masters, shunned by the orthodox yet quietly relied upon for rare medicines.',
    territory: ['Blackwater Marsh'], resources: 40, influence: 25, goals: ['recover the poison codex', 'win recognition', 'survive orthodox hostility'],
    allies: [], enemies: ['faction-jade-hall'], internalTension: 35, playerReputation: 0 },
  { id: 'faction-frostbell-garrison', name: 'Frostbell Garrison', type: 'court',
    description: 'Imperial border troops who tax the pass, hunt deserters, and look the other way when bribed.',
    territory: ['Frostbell Pass'], resources: 65, influence: 50, goals: ['hold the pass', 'feed the garrison', 'suppress banditry'],
    allies: [], enemies: [], internalTension: 30, playerReputation: 0 },
  { id: 'faction-willow-guild', name: 'Willow Merchants\' Guild', type: 'guild',
    description: 'The market town\'s traders. They hire escorts, fund healers, and sell news as readily as grain.',
    territory: ['Willow Market Town', 'The Crossroads'], resources: 70, influence: 40, goals: ['keep roads open', 'stabilize prices', 'secure escorts'],
    allies: [], enemies: [], internalTension: 15, playerReputation: 0 },
];

export const FACTION_RELATIONS: FactionRelationState[] = [
  { id: 'frel-jade-black', factionAId: 'faction-jade-hall', factionBId: 'faction-black-river', trust: -5, hostility: 30, trade: 25 },
  { id: 'frel-jade-lotus', factionAId: 'faction-jade-hall', factionBId: 'faction-crimson-lotus', trust: -40, hostility: 60, trade: 0 },
  { id: 'frel-jade-ninefold', factionAId: 'faction-jade-hall', factionBId: 'faction-ninefold', trust: 50, hostility: 0, trade: 10 },
  { id: 'frel-black-garrison', factionAId: 'faction-black-river', factionBId: 'faction-frostbell-garrison', trust: -10, hostility: 20, trade: 15 },
  { id: 'frel-black-willow', factionAId: 'faction-black-river', factionBId: 'faction-willow-guild', trust: 10, hostility: 10, trade: 50 },
  { id: 'frel-lotus-willow', factionAId: 'faction-crimson-lotus', factionBId: 'faction-willow-guild', trust: 5, hostility: 5, trade: 20 },
];

export const NPC_PROFILES: NpcProfile[] = [
  { zh: '老茶伯', appearance: 'Stooped, tea-stained apron, eyes that miss nothing.',
    voice: 'Gossipy and proverb-fond; deflects danger with a joke and a refill.',
    npc: npc({ id: 'npc-teahouse-keeper', name: 'Old Tea Keeper', role: 'tea house keeper', locationId: 'The Crossroads', factionId: 'faction-willow-guild',
      goals: [goal('goal-tea-open', 'rest', 'Keep the tea house open', 80), goal('goal-avoid-trouble', 'protect', 'Avoid sect trouble', 70)],
      fears: ['bandits', 'war between sects'], secrets: ['Sells the same gossip to Jade Hall and the Black River for protection.'],
      skills: ['tea', 'local gossip', 'basic first aid'], resources: 20 }) },
  { zh: '浪劍客', appearance: 'Sun-browned, a plain sword wrapped in oilcloth, an expulsion scar hidden under his collar.',
    voice: 'Laconic and courteous; speaks of honor as if it were a debt he is still paying.',
    npc: npc({ id: 'npc-wandering-swordsman', name: 'Wandering Swordsman', role: 'wandering martial artist', locationId: 'The Crossroads',
      goals: [goal('goal-worthy-opponent', 'train', 'Find a worthy opponent', 70), goal('goal-repay-debt', 'collect_debt', 'Repay an old debt to Captain Ma', 90, 'npc-ma-tie')],
      fears: ['dishonor', 'betrayal'], secrets: ['Real name Shen Wuyi, once an outer disciple of Jade Hall, expelled for striking a senior.', 'Owes Captain Ma his life.'],
      skills: ['swordsmanship', 'tracking'], resources: 10 }) },
  { zh: '雲霜', appearance: 'Calm, ink-stained fingers, a lacquered medicine chest she never lets out of reach.',
    voice: 'Precise and warm; asks about symptoms before names. Refuses to discuss her past.',
    npc: npc({ id: 'npc-yun-shuang', name: 'Madam Yun Shuang', role: 'healer', locationId: 'Willow Market Town', factionId: 'faction-willow-guild',
      goals: [goal('goal-heal-town', 'protect', 'Keep the town\'s fever season in check', 80), goal('goal-secure-herbs', 'trade', 'Secure marsh herbs before shortages', 70)],
      fears: ['her past being exposed', 'a patient dying under her hands'],
      secrets: ['Once trained as an antidote-maker for the Crimson Lotus Society.', 'Left after refusing to poison a child.'],
      skills: ['medicine', 'antidotes', 'herb lore'], resources: 35 }) },
  { zh: '白青山', appearance: 'White-haired, upright, hands scarred from decades of sword practice.',
    voice: 'Measured, formal, speaks in rules and precedents; warms only when speaking of the young.',
    npc: npc({ id: 'npc-bai-qingshan', name: 'Elder Bai Qingshan', role: 'Jade Hall master', locationId: 'Jade Hall', factionId: 'faction-jade-hall',
      goals: [goal('goal-name-heir', 'social', 'Name an heir before the autumn assembly', 85), goal('goal-recover-volume', 'investigate', 'Recover the missing final volume of the Azure River Sword', 90)],
      fears: ['the Hall splitting', 'dying with the sword manual incomplete'],
      secrets: ['The final volume of the Azure River Sword has been missing for a month.', 'He suspects his best disciple.'],
      skills: ['Azure River Sword', 'inner cultivation', 'leadership'], resources: 55 }) },
  { zh: '顧文', appearance: 'Handsome, restless, speaks softly and watches everyone.',
    voice: 'Courteous with an edge; answers questions with questions.',
    npc: npc({ id: 'npc-gu-wen', name: 'Gu Wen', role: 'Jade Hall senior disciple', locationId: 'Jade Hall', factionId: 'faction-jade-hall',
      goals: [goal('goal-win-succession', 'social', 'Win the succession before the autumn assembly', 85), goal('goal-study-volume', 'train', 'Master the stolen final volume in secret', 75)],
      fears: ['being passed over', 'exposure'],
      secrets: ['Took the final volume of the Azure River Sword to study it.', 'Intends to challenge Elder Bai\'s chosen heir publicly.'],
      skills: ['Azure River Sword', 'etiquette', 'intrigue'], resources: 25 }) },
  { zh: '馬鐵', appearance: 'Broad, river-weathered, a ledger tucked in his sash instead of a weapon.',
    voice: 'Genial and transactional; every kindness is priced, and he never forgets one.',
    npc: npc({ id: 'npc-ma-tie', name: 'Captain Ma Tie', role: 'ferry captain, Black River Brotherhood', locationId: 'Lantern Ferry', factionId: 'faction-black-river',
      goals: [goal('goal-raise-toll', 'trade', 'Raise the ferry toll to fund bribes', 80), goal('goal-collect', 'collect_debt', 'Collect what the swordsman owes', 60, 'npc-wandering-swordsman')],
      fears: ['the garrison cracking down', 'an open war with Jade Hall'],
      secrets: ['The toll increase funds payments to Marshal Zhao.', 'Quietly protects river orphans.'],
      skills: ['river piloting', 'smuggling', 'negotiation'], resources: 45 }) },
  { zh: '慧遠', appearance: 'Slight, serene, a bell-rope callus on each palm.',
    voice: 'Gentle and indirect; answers with a question or a short story, never a command.',
    npc: npc({ id: 'npc-abbot-huiyuan', name: 'Abbot Huiyuan', role: 'abbot', locationId: 'Ninefold Monastery', factionId: 'faction-ninefold',
      goals: [goal('goal-guard-ninth', 'protect', 'Guard the ninth courtyard', 90), goal('goal-heal', 'protect', 'Treat every wounded traveler who arrives', 80)],
      fears: ['what is sealed in the ninth courtyard', 'the monastery being dragged into war'],
      secrets: ['The ninth courtyard holds a sealed manuscript older than the monastery.'],
      skills: ['Nine-Bell Breathing', 'medicine', 'meditation'], resources: 40 }) },
  { zh: '蓮小月', appearance: 'Slim, marsh-pale, a bandolier of needles under a patched cloak.',
    voice: 'Dry, guarded, sometimes startlingly honest; hates being pitied.',
    npc: npc({ id: 'npc-lian-xiaoyue', name: 'Lian Xiaoyue', role: 'needle-master, Crimson Lotus Society', locationId: 'Blackwater Marsh', factionId: 'faction-crimson-lotus',
      goals: [goal('goal-find-codex', 'investigate', 'Find the poison codex in the Sunken Archive', 85, 'Sunken Archive'), goal('goal-antidote', 'trade', 'Obtain the antidote herbs her sister needs', 80)],
      fears: ['her sister dying', 'the orthodox sects hunting her'],
      secrets: ['Her younger sister is dying of a slow poison only the codex can cure.'],
      skills: ['Crimson Lotus Needle Art', 'poison', 'tracking'], resources: 20 }) },
  { zh: '趙榮', appearance: 'Heavy-browed, frost-cracked lips, a commander\'s seal on a cord.',
    voice: 'Curt and procedural; softens only when discussing his soldiers.',
    npc: npc({ id: 'npc-zhao-rong', name: 'Marshal Zhao Rong', role: 'garrison commander', locationId: 'Frostbell Pass', factionId: 'faction-frostbell-garrison',
      goals: [goal('goal-hold-pass', 'protect', 'Hold the pass through winter', 85), goal('goal-feed-garrison', 'trade', 'Secure grain for the garrison', 80)],
      fears: ['mutiny', 'a hungry winter'],
      secrets: ['Skims grain to keep the garrison fed and sells the rest to the marsh.', 'Takes payments from the Black River.'],
      skills: ['Frostbell Spear', 'command', 'logistics'], resources: 60 }) },
  { zh: '阿麟', appearance: 'Quick, barefoot, always carrying something that is not his.',
    voice: 'Fast, cheeky, sells gossip by the piece and lies when it is cheaper.',
    npc: npc({ id: 'npc-ah-lin', name: 'Ah Lin', role: 'street informant', locationId: 'Willow Market Town',
      goals: [goal('goal-sell-news', 'investigate', 'Find news worth selling', 75), goal('goal-eat', 'trade', 'Earn enough for a real meal', 60)],
      fears: ['guild enforcers', 'winter'], secrets: ['Saw a Jade Hall robe near the scripture pavilion the night the volume went missing.'],
      skills: ['rumors', 'pickpocketing', 'tailing'], resources: 3 }) },
  { zh: '蘇眠', fantasy: true, appearance: 'A ferry singer with a river-lamp voice and eyes that catch light like an animal\'s.',
    voice: 'Playful and oblique; answers in song fragments, never lies outright but never answers straight.',
    npc: npc({ id: 'npc-su-mian', name: 'Su Mian', role: 'ferry singer', locationId: 'Lantern Ferry',
      goals: [goal('goal-return-grove', 'travel', 'Return to Moonwell Grove before the autumn moon', 80, 'Moonwell Grove'), goal('goal-listen', 'investigate', 'Listen for who is hunting the grove', 70)],
      fears: ['iron bells', 'being recognized'],
      secrets: ['A fox spirit in human form.', 'Her grove\'s well is being sought by a relic-hunter.'],
      skills: ['singing', 'Foxfire Illusion Steps', 'listening'], resources: 8 }) },
  { zh: '墨老', fantasy: true, appearance: 'Ink-black robes, papery skin, a lantern he never lights.',
    voice: 'Archaic, patient, courteous to a fault; speaks of centuries as if they were seasons.',
    npc: npc({ id: 'npc-archivist-mo', name: 'Old Archivist Mo', role: 'archive keeper', locationId: 'Sunken Archive', factionId: undefined,
      goals: [goal('goal-keep-stacks', 'protect', 'Keep the remaining scrolls from the wrong readers', 90)],
      fears: ['the archive being sold off', 'readers who do not return'],
      secrets: ['Has kept the archive for far longer than a human lifetime.', 'The poison codex is real, and he knows what it costs to read it.'],
      skills: ['scholarship', 'languages', 'ancient arts'], resources: 15 }) },
];

export const RELATIONSHIPS: RelationshipState[] = [
  { id: 'rel-npc-bai-qingshan-npc-gu-wen', subjectId: 'npc-bai-qingshan', targetId: 'npc-gu-wen', trust: 20, respect: 60, fear: 0, affection: 35, debt: 0, grudge: 0 },
  { id: 'rel-npc-gu-wen-npc-bai-qingshan', subjectId: 'npc-gu-wen', targetId: 'npc-bai-qingshan', trust: 10, respect: 50, fear: 15, affection: 20, debt: 0, grudge: 15 },
  { id: 'rel-npc-wandering-swordsman-npc-ma-tie', subjectId: 'npc-wandering-swordsman', targetId: 'npc-ma-tie', trust: 30, respect: 40, fear: 0, affection: 10, debt: 70, grudge: 0 },
  { id: 'rel-npc-ma-tie-npc-wandering-swordsman', subjectId: 'npc-ma-tie', targetId: 'npc-wandering-swordsman', trust: 25, respect: 30, fear: 0, affection: 10, debt: 0, grudge: 0 },
  { id: 'rel-npc-yun-shuang-npc-abbot-huiyuan', subjectId: 'npc-yun-shuang', targetId: 'npc-abbot-huiyuan', trust: 60, respect: 70, fear: 0, affection: 30, debt: 40, grudge: 0 },
  { id: 'rel-npc-lian-xiaoyue-npc-yun-shuang', subjectId: 'npc-lian-xiaoyue', targetId: 'npc-yun-shuang', trust: -10, respect: 30, fear: 0, affection: 0, debt: 0, grudge: 25 },
  { id: 'rel-npc-ma-tie-npc-zhao-rong', subjectId: 'npc-ma-tie', targetId: 'npc-zhao-rong', trust: -5, respect: 15, fear: 20, affection: 0, debt: 0, grudge: 5 },
];

export const OBLIGATIONS: ObligationState[] = [
  { id: 'ob-swordsman-ma', debtorId: 'npc-wandering-swordsman', creditorId: 'npc-ma-tie', kind: 'debt', severity: 3,
    description: 'The swordsman owes Captain Ma his life and has promised to repay it in kind.', fulfilled: false, createdTurn: 0, dueTurn: 40 },
  { id: 'ob-yun-huiyuan', debtorId: 'npc-yun-shuang', creditorId: 'npc-abbot-huiyuan', kind: 'favor', severity: 2,
    description: 'The abbot sheltered Yun Shuang when she fled the marsh; she has promised to serve the infirmary when asked.', fulfilled: false, createdTurn: 0 },
  { id: 'ob-gu-bai-oath', debtorId: 'npc-gu-wen', creditorId: 'npc-bai-qingshan', kind: 'oath', severity: 4,
    description: 'Gu Wen swore a disciple\'s oath of loyalty to Elder Bai.', fulfilled: false, createdTurn: 0 },
];

export const RUMORS: Array<Omit<RumorState, 'createdTurn'> & { fantasy?: boolean; truth: 'true' | 'false' | 'distorted' }> = [
  { id: 'rumor-volume-missing', text: 'The Jade Hall\'s final sword volume has vanished from the scripture pavilion.', origin: 'npc-ah-lin',
    currentLocationId: 'Willow Market Town', status: 'plausible', credibility: 55, knownBy: ['npc-ah-lin'], spreadRate: 1, truth: 'true' },
  { id: 'rumor-toll-hike', text: 'The Black River will double the Lantern Ferry toll before the autumn assembly.', origin: 'npc-teahouse-keeper',
    currentLocationId: 'The Crossroads', status: 'unverified', credibility: 65, knownBy: ['npc-teahouse-keeper'], spreadRate: 1, truth: 'true' },
  { id: 'rumor-grain-skim', text: 'Marshal Zhao is selling the garrison\'s grain to bandits in the marsh.', origin: 'npc-ah-lin',
    currentLocationId: 'Willow Market Town', status: 'unverified', credibility: 40, knownBy: ['npc-ah-lin'], spreadRate: 1, truth: 'distorted' },
  { id: 'rumor-healer-lotus', text: 'The healer of Willow Market was once a Crimson Lotus poisoner.', origin: 'npc-ah-lin',
    currentLocationId: 'Willow Market Town', status: 'unverified', credibility: 30, knownBy: ['npc-ah-lin'], spreadRate: 1, truth: 'true' },
  { id: 'rumor-ghost-singer', text: 'A ferry singer at Lantern Ferry never ages and never lies, and fishermen who follow her song are not seen again.', origin: 'npc-ma-tie',
    currentLocationId: 'Lantern Ferry', status: 'unverified', credibility: 25, knownBy: ['npc-ma-tie'], spreadRate: 1, truth: 'distorted', fantasy: true },
  { id: 'rumor-archive-codex', text: 'A forbidden poison codex lies in the Sunken Archive, and whoever reads it forgets their own name.', origin: 'npc-lian-xiaoyue',
    currentLocationId: 'Blackwater Marsh', status: 'unverified', credibility: 45, knownBy: ['npc-lian-xiaoyue'], spreadRate: 1, truth: 'true', fantasy: true },
];

export const WORLD_EVENTS: WorldEventState[] = [
  { id: 'event-toll-dispute', kind: 'conflict', title: 'The Ferry Toll Dispute',
    description: 'Jade Hall couriers and the Black River argue over the Lantern Ferry toll; tempers are rising.',
    locationId: 'Lantern Ferry', factionIds: ['faction-jade-hall', 'faction-black-river'], severity: 2, active: true, createdTurn: 0 },
  { id: 'event-fever-season', kind: 'natural', title: 'Fever Season in Willow Market',
    description: 'A river fever is spreading through the market town; medicine prices are climbing.',
    locationId: 'Willow Market Town', factionIds: ['faction-willow-guild'], severity: 2, active: true, createdTurn: 0, expiresTurn: 30 },
  { id: 'event-autumn-assembly', kind: 'political', title: 'The Autumn Assembly Approaches',
    description: 'Jade Hall must name an heir before the autumn assembly; rival disciples are positioning themselves.',
    locationId: 'Jade Hall', factionIds: ['faction-jade-hall'], severity: 3, active: true, createdTurn: 0, expiresTurn: 60 },
];

/** Stock 20 is "no scarcity" in the v3 price model; lower stock raises scarcity and price. */
export const MARKETS: MarketState[] = [
  { locationId: 'The Crossroads', goods: { tea: 22, rice: 20, medicine: 12, wine: 16 }, basePrices: { tea: 4, rice: 3, medicine: 12, wine: 6 },
    priceMultipliers: { tea: 1, rice: 1, medicine: 1, wine: 1 }, scarcity: { tea: 0, rice: 0, medicine: 24, wine: 12 }, lastUpdatedTurn: 0 },
  { locationId: 'Lantern Ferry', goods: { fish: 24, salt: 14, wine: 20, rope: 18 }, basePrices: { fish: 3, salt: 8, wine: 6, rope: 5 },
    priceMultipliers: { fish: 1, salt: 1, wine: 1, rope: 1 }, scarcity: { fish: 0, salt: 18, wine: 0, rope: 6 }, lastUpdatedTurn: 0 },
  { locationId: 'Willow Market Town', goods: { rice: 26, silk: 20, medicine: 8, herbs: 10 }, basePrices: { rice: 3, silk: 25, medicine: 12, herbs: 7 },
    priceMultipliers: { rice: 1, silk: 1, medicine: 1, herbs: 1 }, scarcity: { rice: 0, silk: 0, medicine: 36, herbs: 30 }, lastUpdatedTurn: 0 },
  { locationId: 'Frostbell Pass', goods: { grain: 10, iron: 20, furs: 22, wine: 12 }, basePrices: { grain: 5, iron: 14, furs: 10, wine: 8 },
    priceMultipliers: { grain: 1, iron: 1, furs: 1, wine: 1 }, scarcity: { grain: 30, iron: 0, furs: 0, wine: 24 }, lastUpdatedTurn: 0 },
];

function cloneAll<T>(items: T[]): T[] { return items.map(item => JSON.parse(JSON.stringify(item))); }

export interface WuxiaJianghuOptions {
  fantasy?: FantasyLayerConfig;
}

/**
 * Build the authored starting Jianghu. Pure and deterministic: no randomness,
 * and every returned object is an independent copy of the catalog data.
 * When the fantasy layer is off, supernatural NPCs, rumors, and locations are omitted.
 */
export function createWuxiaJianghu(options: WuxiaJianghuOptions = {}): JianghuState {
  const fantasy = options.fantasy ?? FANTASY_PRESETS[DEFAULT_FANTASY_PRESET];
  const withFantasy = supernaturalEnabled(fantasy);
  const locationIds = new Set(locationsFor(withFantasy).map(l => l.id));

  const npcs = cloneAll(NPC_PROFILES.filter(p => withFantasy || !p.fantasy).map(p => p.npc));
  const npcIds = new Set(npcs.map(n => n.id));
  const factions = cloneAll(FACTIONS).map(f => ({ ...f, territory: f.territory.filter(t => locationIds.has(t)) }));
  const rumors = cloneAll(RUMORS.filter(r => withFantasy || !r.fantasy)).map(({ truth: _truth, fantasy: _fantasy, ...rest }) => ({ ...rest, createdTurn: 0 }));

  return {
    schemaVersion: 1,
    npcs,
    factions,
    relationships: cloneAll(RELATIONSHIPS).filter(r => npcIds.has(r.subjectId) && npcIds.has(r.targetId)),
    rumors,
    obligations: cloneAll(OBLIGATIONS).filter(o => npcIds.has(o.debtorId) && npcIds.has(o.creditorId)),
    worldEvents: cloneAll(WORLD_EVENTS),
    knowledgeVersion: 1,
    knowledgeRecords: [],
    causalChains: [],
    locationConditions: [],
    factionRelations: cloneAll(FACTION_RELATIONS),
    markets: cloneAll(MARKETS).filter(m => locationIds.has(m.locationId)),
  };
}

/** Ids the simulation should register as `world.locationIds` for this setting. */
export function wuxiaLocationIds(fantasy: FantasyLayerConfig = FANTASY_PRESETS[DEFAULT_FANTASY_PRESET]): string[] {
  return locationsFor(supernaturalEnabled(fantasy)).map(l => l.id);
}
