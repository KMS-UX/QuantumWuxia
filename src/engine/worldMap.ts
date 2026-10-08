/**
 * The world's roads and places, as plain data inside the simulation state (Bible
 * section 11: travel takes time). Framework only; a setting supplies the edges.
 */
export type Climate = 'temperate' | 'river' | 'mountain' | 'marsh' | 'cold' | 'forest';

export interface MapEdge { a: string; b: string; /** Travel time in ticks (one tick = four hours). */ ticks: number }
export interface PlaceInfo { climate?: Climate; /** Weather does not touch people indoors. */ indoors?: boolean }
export interface WorldMap { edges: MapEdge[]; places?: Record<string, PlaceInfo> }

/** The id a character or NPC has while on the road: they are in no place and cannot see or be seen. */
export const TRANSIT_LOCATION = '__transit__';

/** Shortest travel time between two places, in ticks, or undefined when there is no route. Dijkstra, deterministic. */
export function routeTicks(map: WorldMap | undefined, from: string, to: string): number | undefined {
  if (!map) return undefined;
  if (from === to) return 0;
  const dist = new Map<string, number>([[from, 0]]);
  const done = new Set<string>();
  while (true) {
    let current: string | undefined; let best = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && (d < best || (d === best && current !== undefined && id < current))) { best = d; current = id; }
    if (current === undefined) return undefined;
    if (current === to) return best;
    done.add(current);
    for (const edge of map.edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : undefined;
      if (next === undefined || done.has(next)) continue;
      const candidate = best + edge.ticks;
      if (candidate < (dist.get(next) ?? Infinity)) dist.set(next, candidate);
    }
  }
}

export const climateAt = (map: WorldMap | undefined, id: string): Climate => map?.places?.[id]?.climate ?? 'temperate';
export const isIndoors = (map: WorldMap | undefined, id: string): boolean => map?.places?.[id]?.indoors ?? false;

export function validateMap(map: WorldMap, locationIds: string[]): string[] {
  const issues: string[] = [];
  for (const e of map.edges) {
    if (!locationIds.includes(e.a) || !locationIds.includes(e.b)) issues.push(`edge ${e.a}-${e.b} names an unknown location`);
    if (!Number.isInteger(e.ticks) || e.ticks < 1 || e.ticks > 240) issues.push(`edge ${e.a}-${e.b} has an invalid travel time`);
    if (e.a === e.b) issues.push(`edge ${e.a} loops onto itself`);
  }
  for (const id of Object.keys(map.places ?? {})) if (!locationIds.includes(id)) issues.push(`place info for unknown location ${id}`);
  return issues;
}
