/**
 * The Nine Rivers Jianghu — location graph.
 *
 * Location ids are the English display names, matching the existing
 * `GameState.location` strings and the default `'The Crossroads'` start.
 * Distances are travel-days; the graph is undirected.
 */
export type Terrain = 'road' | 'river' | 'mountain' | 'town' | 'marsh' | 'pass' | 'forest' | 'ruin';

export interface LocationProfile {
  id: string;
  zh: string;
  region: string;
  terrain: Terrain;
  summary: string;
  /** Inspectable points of interest (candidate targets for `inspect` once the contract supports features). */
  features: string[];
  hazards: string[];
  /** Part of the optional supernatural layer; hidden when the layer is off. */
  fantasy?: boolean;
}

export interface TravelEdge { a: string; b: string; days: number }

export const LOCATIONS: LocationProfile[] = [
  { id: 'The Crossroads', zh: '十字路口', region: 'Central Plain', terrain: 'road',
    summary: 'Four roads meet beneath an old camphor tree. A tea house, a notice wall, and everyone passing through.',
    features: ['notice wall', 'camphor tree shrine', 'tea house back room'], hazards: ['pickpockets'] },
  { id: 'Lantern Ferry', zh: '燈渡', region: 'Nine Rivers', terrain: 'river',
    summary: 'A lamp-lit river port where smugglers, pilgrims and sect couriers share the same boats. Tolls are negotiable; tempers are not.',
    features: ['toll house', 'lantern pier', 'sunken barge'], hazards: ['river brawls', 'toll disputes'] },
  { id: 'Willow Market Town', zh: '柳市', region: 'Nine Rivers', terrain: 'town',
    summary: 'The Jianghu\'s pantry and pharmacy: grain, silk, medicine, and every rumor worth its price.',
    features: ['herb stalls', 'guild hall', 'storyteller\'s corner'], hazards: ['swindlers', 'fever season'] },
  { id: 'Jade Hall', zh: '玉堂', region: 'Azure Hills', terrain: 'mountain',
    summary: 'An orthodox sword sect behind white walls and cypress. Famous for its rules, quietly strained by its succession.',
    features: ['training courtyard', 'ancestral tablet hall', 'sealed scripture pavilion'], hazards: ['sect discipline'] },
  { id: 'Cloudstep Peak', zh: '踏雲峰', region: 'Azure Hills', terrain: 'mountain',
    summary: 'A knife-edge ridge where qinggong is tested and old masters retreat to die or to ascend.',
    features: ['chain bridge', 'hermit caves', 'wind-scoured stele'], hazards: ['falls', 'thin air'] },
  { id: 'Ninefold Monastery', zh: '九重寺', region: 'Silent Vale', terrain: 'mountain',
    summary: 'Nine courtyards, nine bells, one rule: all who arrive wounded are treated first and questioned later.',
    features: ['bell tower', 'infirmary court', 'ninth courtyard (closed)'], hazards: ['vows of silence'] },
  { id: 'Frostbell Pass', zh: '霜鈴關', region: 'Northern March', terrain: 'pass',
    summary: 'A fortified mountain pass hung with frost-bells that ring when the wind turns. Imperial soldiers, border traders, and deserters.',
    features: ['garrison gate', 'bell line', 'granary'], hazards: ['blizzards', 'press-gangs'] },
  { id: 'Blackwater Marsh', zh: '黑水澤', region: 'Nine Rivers', terrain: 'marsh',
    summary: 'Reed labyrinths and tea-dark water. Rare herbs and rarer poisons grow here; so do outlaws.',
    features: ['reed maze', 'stilt village', 'poison-herb beds'], hazards: ['miasma', 'bandits', 'getting lost'] },
  { id: 'Sunken Archive', zh: '沉卷閣', region: 'Silent Vale', terrain: 'ruin',
    summary: 'A library half-drowned by a vanished lake. Its remaining scrolls are said to rewrite those who read them.',
    features: ['flooded stacks', 'reading platform', 'iron lock-room'], hazards: ['collapse', 'cursed texts'], fantasy: true },
  { id: 'Moonwell Grove', zh: '月井林', region: 'Azure Hills', terrain: 'forest',
    summary: 'A ring of silver birch around a still well that shows the sky at the wrong hour. Locals leave offerings and do not linger.',
    features: ['moonwell', 'offering stones', 'fox-shrine'], hazards: ['lost time', 'illusions'], fantasy: true },
];

export const TRAVEL_EDGES: TravelEdge[] = [
  { a: 'The Crossroads', b: 'Lantern Ferry', days: 1 },
  { a: 'The Crossroads', b: 'Willow Market Town', days: 1 },
  { a: 'The Crossroads', b: 'Jade Hall', days: 2 },
  { a: 'The Crossroads', b: 'Frostbell Pass', days: 3 },
  { a: 'Lantern Ferry', b: 'Willow Market Town', days: 2 },
  { a: 'Lantern Ferry', b: 'Blackwater Marsh', days: 2 },
  { a: 'Willow Market Town', b: 'Ninefold Monastery', days: 2 },
  { a: 'Jade Hall', b: 'Cloudstep Peak', days: 1 },
  { a: 'Cloudstep Peak', b: 'Moonwell Grove', days: 2 },
  { a: 'Ninefold Monastery', b: 'Sunken Archive', days: 3 },
  { a: 'Ninefold Monastery', b: 'Frostbell Pass', days: 3 },
  { a: 'Blackwater Marsh', b: 'Sunken Archive', days: 2 },
];

/** Climate per place: it shapes the weather the framework deals out there (engine/weather.ts). */
const CLIMATE: Record<string, import('../../engine/worldMap').Climate> = {
  'The Crossroads': 'temperate', 'Lantern Ferry': 'river', 'Willow Market Town': 'temperate', 'Jade Hall': 'mountain',
  'Cloudstep Peak': 'mountain', 'Ninefold Monastery': 'mountain', 'Frostbell Pass': 'cold', 'Blackwater Marsh': 'marsh',
  'Sunken Archive': 'marsh', 'Moonwell Grove': 'forest',
};

/** The authored roads as engine data. One travel day is a full day (six four-hour ticks). */
export function buildWorldMap(includeFantasy: boolean): import('../../engine/worldMap').WorldMap {
  const places = locationsFor(includeFantasy);
  const ids = new Set(places.map(l => l.id));
  return {
    edges: TRAVEL_EDGES.filter(e => ids.has(e.a) && ids.has(e.b)).map(e => ({ a: e.a, b: e.b, ticks: e.days * 6 })),
    places: Object.fromEntries(places.map(l => [l.id, { climate: CLIMATE[l.id] ?? 'temperate' }])),
  };
}

export function locationsFor(includeFantasy: boolean): LocationProfile[] {
  return LOCATIONS.filter(location => includeFantasy || !location.fantasy);
}

/** Shortest travel time (days) between two locations, or undefined when unreachable. */
export function travelDays(from: string, to: string, includeFantasy = true): number | undefined {
  const allowed = new Set(locationsFor(includeFantasy).map(l => l.id));
  if (!allowed.has(from) || !allowed.has(to)) return undefined;
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    queue.sort((x, y) => dist.get(x)! - dist.get(y)!);
    const current = queue.shift()!;
    if (current === to) return dist.get(current);
    for (const edge of TRAVEL_EDGES) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : undefined;
      if (!next || !allowed.has(next)) continue;
      const candidate = dist.get(current)! + edge.days;
      if (candidate < (dist.get(next) ?? Infinity)) {
        dist.set(next, candidate);
        queue.push(next);
      }
    }
  }
  return undefined;
}
