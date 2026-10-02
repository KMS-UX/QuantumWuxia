import type { JianghuState, NPCState } from './jianghu';
import type { SimulationState, StateEvent, ProposedAction, ResolutionStatus, SimCharacter } from './types';
import type { MartialArt, MartialTechnique, WuxiaSimulationState } from './wuxia';
import { isHonourableBout } from './bout';
import { upsertRelationship } from './jianghu';
import { effectiveAttribute, martialPower } from './wuxiaRules';

/**
 * Martial combat resolution (Game Bible sections 6-8): learned arts with
 * requirements, techniques that cost Qi, counters between styles, injuries that
 * matter, and defeat that creates a new situation instead of an end screen.
 *
 * Everything here is deterministic given the roll: no randomness, no LLM.
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const COMBAT_ART_TYPES = new Set(['external', 'sword', 'saber', 'spear', 'fist', 'palm', 'hidden_weapon']);
const REGIONS = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'internal'] as const;
type Region = typeof REGIONS[number];

type Wuxia = SimCharacter & { wuxia: NonNullable<SimCharacter['wuxia']> };
const hasWuxia = (c: SimCharacter): c is Wuxia => !!c.wuxia;

export interface ArtUse { art: MartialArt; technique?: MartialTechnique }

/** The owned technique with this exact id, with its art. */
export function findTechnique(c: SimCharacter, techniqueId?: string): ArtUse | undefined {
  if (!techniqueId || !c.wuxia) return undefined;
  for (const art of c.wuxia.martialArts) {
    const technique = art.techniques.find(t => t.id === techniqueId);
    if (technique) return { art, technique };
  }
  return undefined;
}

/** Turn free text ("ripple parry", "Azure River Sword", "fourth bell") into an owned technique id, if it names one. */
export function matchTechniqueText(text: string, c: SimCharacter): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const wanted = norm(text);
  if (!wanted || !c.wuxia) return undefined;
  for (const art of c.wuxia.martialArts) {
    for (const t of art.techniques) {
      const name = norm(t.name);
      if (norm(t.id) === wanted || name.includes(wanted) || wanted.includes(name)) return t.id;
    }
  }
  for (const art of c.wuxia.martialArts) {
    const name = norm(art.name);
    if (name === wanted || wanted.includes(name)) {
      // Naming only the art means its basic form: the cheapest technique, best-practised on ties.
      return [...art.techniques].sort((a, b) => a.qiCost - b.qiCost || b.mastery - a.mastery || a.id.localeCompare(b.id))[0]?.id;
    }
  }
  return undefined;
}

export function bestCombatArt(c: SimCharacter): MartialArt | undefined {
  return (c.wuxia?.martialArts ?? [])
    .filter(a => COMBAT_ART_TYPES.has(a.type))
    .sort((a, b) => martialPower(b) - martialPower(a) || a.id.localeCompare(b.id))[0];
}

export function techniqueLocked(art: MartialArt, technique: MartialTechnique): boolean {
  return technique.minMastery !== undefined && art.mastery < technique.minMastery;
}

export function opponentPower(npc: NPCState): number {
  return clamp(npc.power ?? 10 + Math.floor(npc.resources / 2) + 3 * npc.skills.length, 5, 95);
}

/** +10 when the art has the upper hand against any of the opponent's arts, -10 when it is countered. */
export function counterBonus(art: MartialArt | undefined, npc: NPCState): number {
  if (!art) return 0;
  const theirs = npc.arts ?? [];
  const up = (art.strongAgainstArts ?? []).some(id => theirs.includes(id)) ? 10 : 0;
  const down = (art.counteredByArts ?? []).some(id => theirs.includes(id)) ? 10 : 0;
  return up - down;
}

/** Region-specific handicaps (Bible section 7): arms and head hamper fighting, legs hamper travel and stealth. */
export function injuryPenalty(c: SimCharacter, kind: ProposedAction['kind']): number {
  let penalty = 0;
  for (const injury of c.wuxia?.injuries ?? []) {
    const arm = injury.bodyRegion === 'leftArm' || injury.bodyRegion === 'rightArm';
    const leg = injury.bodyRegion === 'leftLeg' || injury.bodyRegion === 'rightLeg';
    if (kind === 'attack' || kind === 'train') penalty += arm ? injury.severity * 2 : injury.bodyRegion === 'head' ? injury.severity * 2 : 0;
    if (kind === 'travel' || kind === 'stealth') penalty += leg ? injury.severity * 5 : 0;
  }
  return penalty;
}

/** How strong the player is in this exchange (added to the roll). */
export function combatEdge(c: SimCharacter, use: ArtUse | undefined, npc: NPCState): number {
  const base = hasWuxia(c)
    ? Math.floor((effectiveAttribute(c as WuxiaSimulationState, 'strength') + effectiveAttribute(c as WuxiaSimulationState, 'agility')) / 2)
    : Math.floor((c.attributes.strength + c.attributes.agility) / 2);
  const art = use ? Math.floor(martialPower(use.art) / 5) : 0;
  const tech = use?.technique ? Math.floor(use.technique.mastery / 10) : 0;
  return base + art + tech + counterBonus(use?.art, npc) - injuryPenalty(c, 'attack');
}

export function duelDifficulty(npc: NPCState, risk: ProposedAction['risk'], luck: number): number {
  const riskMod = risk === 'low' ? -10 : risk === 'high' ? 10 : 0;
  return clamp(20 + Math.floor(opponentPower(npc) * 0.6) + riskMod - Math.floor(luck / 5), 5, 95);
}

export { isHonourableBout };

/** Mastery gained from use or practice; diminishes as mastery rises. */
export function masteryGain(status: ResolutionStatus, mastery: number, practice: boolean): number {
  const base = practice ? (status === 'success' ? 3 : status === 'partial' ? 2 : 0) : (status === 'success' ? 2 : 1);
  return base === 0 ? 0 : Math.max(1, base - Math.floor(mastery / 40));
}

export function applyMastery(c: SimCharacter, use: ArtUse | undefined, gain: number, events: StateEvent[]): void {
  if (!use || gain <= 0) return;
  const before = use.art.mastery;
  use.art.mastery = clamp(use.art.mastery + gain, 0, 100);
  if (use.technique) use.technique.mastery = clamp(use.technique.mastery + Math.max(1, Math.floor(gain / 2) + 1), 0, 100);
  if (use.art.mastery !== before) {
    events.push({
      type: 'character.mastery_changed', causes: [`art:${use.art.id}`, use.technique ? `technique:${use.technique.id}` : 'practice'],
      witnesses: [c.id], knowledgeConsequences: [`player:skill:${use.art.id}`],
      payload: { artId: use.art.id, artName: use.art.name, from: before, to: use.art.mastery },
    });
  }
}

export type DefeatOutcome = 'mercy' | 'robbed' | 'detained' | 'killed';

/** Pure rule for what a defeat means (Bible section 7): a new situation, with death only when the circumstances justify it. */
export function chooseDefeat(args: {
  jianghu: JianghuState; opponent: NPCState; honourable: boolean; risk: ProposedAction['risk']; margin: number;
}): DefeatOutcome {
  const { jianghu, opponent, honourable, risk, margin } = args;
  if (honourable) return 'mercy';
  const faction = jianghu.factions.find(f => f.id === opponent.factionId);
  if (faction?.type === 'religious' || /healer|abbot|physician/i.test(opponent.role) || opponent.disposition >= 10) return 'mercy';
  if (risk === 'high' && opponent.skills.length > 0 && opponentPower(opponent) >= 70 && margin >= 30) return 'killed';
  if (faction?.type === 'court') return 'detained';
  return 'robbed';
}

export interface DuelInput {
  state: SimulationState;
  c: SimCharacter;
  opponent: NPCState;
  status: ResolutionStatus;
  roll: number;
  score: number;
  difficulty: number;
  use?: ArtUse;
  action: ProposedAction;
  qiSpent: number;
}

/** Apply a resolved duel in place: damage, injury, defeat, social and faction fallout, mastery. */
export function applyDuel(input: DuelInput, events: StateEvent[]): void {
  const { state, c, opponent, status, roll, score, difficulty, use, action, qiSpent } = input;
  const jianghu = state.jianghu!;
  const turn = state.world.turn;
  const honourable = isHonourableBout(action.description);
  const power = opponentPower(opponent);
  const margin = Math.max(0, difficulty - score);
  const bystanders = jianghu.npcs.filter(n => n.alive && n.id !== opponent.id && n.locationId === c.locationId);

  // --- damage and injury to the player
  let damage = 0;
  if (status !== 'success') {
    const riskMul = action.risk === 'high' ? 1.5 : action.risk === 'low' ? 0.75 : 1;
    const base = 6 + Math.floor(power / 4) + Math.floor(margin / 3);
    damage = Math.max(1, Math.round(base * riskMul * (honourable ? 0.6 : 1)) - Math.floor(c.attributes.constitution / 5));
    if (status === 'partial') damage = Math.max(1, Math.floor(damage / 2));
    damage = Math.min(damage, c.hp);
  }
  if (damage > 0) {
    c.hp -= damage;
    events.push({ type: 'character.hp_changed', causes: ['action:attack', `opponent:${opponent.id}`], payload: { amount: -damage, reason: 'combat' } });
    if (hasWuxia(c)) {
      const severityCap = honourable ? 2 : 4;
      const severity = clamp(status === 'partial' ? 1 : 1 + (margin >= 15 ? 1 : 0) + (damage >= 25 ? 1 : 0), 1, severityCap);
      const bodyRegion: Region = REGIONS[(roll + turn) % REGIONS.length];
      const injury = { id: `wound-${turn + 1}-${opponent.id}`, severity, bodyRegion, healingTurns: severity * 4 + 2, untreated: true };
      c.wuxia.injuries.push(injury);
      events.push({ type: 'character.injury_added', causes: ['action:attack', `opponent:${opponent.id}`], witnesses: [c.id], payload: { id: injury.id, severity, bodyRegion } });
    }
  }

  const counter = counterBonus(use?.art, opponent);
  const outcome = status === 'success' ? 'won' : status === 'partial' ? 'drew' : 'lost';
  events.push({
    type: 'character.combat_resolved',
    causes: ['action:attack', `resolution:${status}`, `opponent:${opponent.id}`],
    witnesses: [c.id, opponent.id, ...bystanders.map(n => n.id)],
    payload: {
      opponentId: opponent.id, outcome, damage, honourable, qiSpent, artId: use?.art.id ?? null, techniqueId: use?.technique?.id ?? null,
      counter: counter > 0 ? 'advantage' : counter < 0 ? 'disadvantage' : 'even',
    },
  });

  // --- fallout with the opponent, their faction and onlookers.
  // An assault already costs trust, goodwill and faction standing in the Jianghu reaction pass
  // (jianghu.ts); this adds what depends on HOW the fight went. A friendly bout skips that pass.
  opponent.memories.push({
    id: `memory-${opponent.id}-${turn}-fight`,
    event: honourable ? `Crossed blades with ${c.name} in a bout` : `Fought ${c.name}`,
    interpretation: outcome === 'won' ? `${c.name} bested me${honourable ? ' fairly' : ''}` : outcome === 'drew' ? `${c.name} held their own against me` : `I bested ${c.name}`,
    valence: honourable ? 'neutral' : 'negative', confidence: 90, turn,
  });
  const rel = upsertRelationship(jianghu.relationships, c.id, opponent.id, turn);
  if (honourable) {
    opponent.disposition = clamp(opponent.disposition - 5, -100, 100);
    rel.respect = clamp(rel.respect + (outcome === 'lost' ? -2 : 8), -100, 100);
  } else {
    opponent.disposition = clamp(opponent.disposition - 15, -100, 100);
    rel.trust = clamp(rel.trust - 20, -100, 100);
    rel.grudge = clamp(rel.grudge + 20, 0, 100);
    rel.fear = clamp(rel.fear + (outcome === 'won' ? 17 : 0), 0, 100);
    rel.respect = clamp(rel.respect + (outcome === 'won' ? 5 : outcome === 'drew' ? 10 : -5), -100, 100);
    const faction = jianghu.factions.find(f => f.id === opponent.factionId);
    if (faction) faction.playerReputation = clamp(faction.playerReputation - 5, -100, 100);
    for (const n of bystanders) n.disposition = clamp(n.disposition - 3, -100, 100);
  }
  if (hasWuxia(c)) {
    const face = c.wuxia.social.face;
    c.wuxia.social.face = clamp(face + (outcome === 'won' && power >= (honourable ? 40 : 50) ? (honourable ? 8 : 5) : outcome === 'lost' ? (honourable ? -10 : -8) : 0), 0, 100);
  }

  // --- art mastery from the exchange
  // Beating someone far weaker teaches nothing, so attacking bystanders cannot be farmed for mastery.
  applyMastery(c, use, status === 'success' && power < 30 ? 0 : masteryGain(status, use?.art.mastery ?? 0, false), events);

  // --- defeat creates a new situation
  if (c.hp <= 0) {
    const defeat = chooseDefeat({ jianghu, opponent, honourable, risk: action.risk, margin });
    let itemsLost: string[] = [];
    if (defeat === 'killed') {
      c.hp = 0;
    } else {
      c.hp = Math.max(1, Math.ceil(c.maxHp * (defeat === 'mercy' ? 0.2 : 0.15)));
      if (defeat === 'robbed') { itemsLost = c.inventory.slice(-2); c.inventory = c.inventory.slice(0, Math.max(0, c.inventory.length - 2)); }
      if (defeat === 'detained') { itemsLost = [...c.inventory]; c.inventory = []; c.fatigue = clamp(c.fatigue + 30, 0, 100); }
      if (hasWuxia(c)) c.wuxia.social.face = clamp(c.wuxia.social.face - (honourable ? 0 : 15), 0, 100);
    }
    events.push({
      type: 'character.defeated',
      causes: ['action:attack', `opponent:${opponent.id}`, `defeat:${defeat}`],
      witnesses: [c.id, opponent.id, ...bystanders.map(n => n.id)],
      payload: { outcome: defeat, opponentId: opponent.id, itemsLost: itemsLost.length, hp: c.hp },
    });
  }
}
