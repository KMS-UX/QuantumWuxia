import { matchTechniqueText } from './combat';
import { TICKS_PER_DAY, ticksUntilPhase, type Phase } from './clock';
import type { ProposedAction, RiskLevel, SimulationState } from './types';

const KEYWORDS: Array<[ProposedAction['kind'], string[]]> = [
  ['travel', ['travel', 'go ', 'head ', 'follow ', 'enter ', 'leave ', 'return ', 'move ']],
  ['attack', ['attack', 'fight', 'strike', 'hit ', 'ambush', 'kill ', 'duel']],
  ['stealth', ['sneak', 'hide', 'creep', 'stealth', 'slip past', 'conceal']],
  ['meditate', ['meditate', 'cultivate', 'focus qi', 'circulate qi', 'breathe']],
  ['rest', ['rest', 'sleep', 'wait ', 'make camp', 'camp out', 'overnight', 'recover', 'catch my breath', 'lie low']],
  ['talk', ['talk', 'speak', 'ask ', 'question', 'negotiate', 'call out', 'persuade']],
  ['train', ['train', 'practice', 'practise', 'drill', 'rehearse', 'hone ']],
  ['inspect', ['inspect', 'examine', 'search', 'look ', 'read ', 'listen', 'study', 'investigate']],
];

/** A keyword counts only where a word starts, so "rest" no longer matches "forest" and "camp" no longer matches "camphor". */
function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => {
    const at = text.indexOf(keyword);
    if (at === -1) return false;
    for (let i = at; i !== -1; i = text.indexOf(keyword, i + 1)) if (i === 0 || !/[a-z]/.test(text[i - 1])) return true;
    return false;
  });
}

function inferTarget(text: string, simulation: SimulationState): string | undefined {
  const npc = simulation.jianghu?.npcs.find(person => text.includes(person.name.toLowerCase()));
  return npc?.id;
}

function inferDestination(text: string, simulation: SimulationState): string | undefined {
  return simulation.world.locationIds.find(id => text.includes(id.toLowerCase()));
}

function inferApproach(text: string): string | undefined {
  const approaches: Array<[string, string]> = [
    ['quietly', 'quiet'],
    ['carefully', 'careful'],
    ['cautiously', 'cautious'],
    ['aggressively', 'aggressive'],
    ['openly', 'open'],
    ['secretly', 'secret'],
  ];
  return approaches.find(([keyword]) => text.includes(keyword))?.[1];
}

const UNTIL: Array<[RegExp, Phase]> = [
  [/\b(?:dawn|daybreak|sunrise|first light)\b/, 'dawn'],
  [/\b(?:morning)\b/, 'morning'],
  [/\b(?:noon|midday|afternoon)\b/, 'afternoon'],
  [/\b(?:dusk|sunset|evening|nightfall)\b/, 'evening'],
  [/\b(?:midnight|small hours)\b/, 'late_night'],
  [/\b(?:night)\b/, 'night'],
];
const NUMBER: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

/**
 * How long a player wants to spend waiting, resting or meditating, in ticks: "until dawn", "overnight",
 * "for two days", "for a watch". Undefined when they name no duration, so the action keeps its default.
 * Bounded to four days so a typo cannot skip the world.
 */
export function inferDuration(lower: string, simulation: SimulationState): number | undefined {
  const until = lower.match(/\b(?:until|till|til|before|\bto)\s+(?:the\s+)?(?:next\s+)?([a-z ]+)/);
  if (until) for (const [pattern, phase] of UNTIL) if (pattern.test(until[1])) return Math.min(4 * TICKS_PER_DAY, ticksUntilPhase(simulation.world, phase));
  if (/\bovernight\b|\bthrough the night\b|\bsleep\b/.test(lower) && !/\bsleep(?:ing)? (?:in|on|at)\b.*\b(?:day|noon)\b/.test(lower)) return ticksUntilPhase(simulation.world, 'dawn');
  const span = lower.match(/\bfor\s+(an?|one|two|three|four|five|six|seven|eight|\d+)\s+(day|days|night|nights|watch|watches|hour|hours)\b/);
  if (span) {
    const n = NUMBER[span[1]] ?? Number(span[1]);
    const unit = span[2];
    const ticks = unit.startsWith('day') ? n * TICKS_PER_DAY : unit.startsWith('night') ? n * TICKS_PER_DAY : unit.startsWith('watch') ? n : Math.ceil(n / 4);
    return Math.max(1, Math.min(4 * TICKS_PER_DAY, ticks));
  }
  return undefined;
}

/**
 * Resolve a technique the player names to a technique they actually own. Free text that names
 * nothing they know ("with my sword") is dropped rather than passed on, so a casual phrase can
 * never make an otherwise legal action fail validation.
 */
function inferTechnique(text: string, simulation: SimulationState): string | undefined {
  const phrases = [
    text.match(/(?:use|with|using)\s+(?:the\s+|my\s+)?([a-z0-9_:-]+(?:\s+[a-z0-9_:-]+){0,3})/i)?.[1],
    text.match(/(?:practi[sc]e|drill|rehearse|hone|train)\s+(?:the\s+|my\s+)?([a-z0-9_:-]+(?:\s+[a-z0-9_:-]+){0,3})/i)?.[1],
    text,
  ];
  for (const phrase of phrases) {
    const id = phrase ? matchTechniqueText(phrase, simulation.character) : undefined;
    if (id) return id;
  }
  return undefined;
}

function inferGoal(text: string, simulation: SimulationState): string | undefined {
  // "to" also introduces destinations ("travel to mountain"), so skip matches
  // whose remainder starts with a known location or NPC name.
  const knownNames = [
    ...simulation.world.locationIds,
    ...(simulation.jianghu?.npcs.map(npc => npc.name) ?? []),
  ].map(name => name.toLowerCase());
  // Markers only (no greedy tail) so overlapping "to ... to ..." occurrences are all visited.
  for (const marker of text.matchAll(/(?:in order to|so that|\bto)\s+/gi)) {
    const rest = text.slice((marker.index ?? 0) + marker[0].length).trim();
    if (!rest) continue;
    if (knownNames.some(name => rest.toLowerCase().startsWith(name))) continue;
    return rest;
  }
  return undefined;
}

function inferConditionalClauses(text: string): string[] | undefined {
  const clauses = Array.from(text.matchAll(/\bif\s+(.+?)(?=\s+(?:then|and|but)\b|$)/gi))
    .map(match => match[1]?.trim())
    .filter((clause): clause is string => Boolean(clause));
  return clauses.length > 0 ? clauses : undefined;
}

function inferDeclaredConstraints(text: string): string[] | undefined {
  const clauses = [
    ...Array.from(text.matchAll(/\b(only if\s+.+?)(?=\s+(?:then|and|but)\b|$)/gi)).map(match => match[1]?.trim()),
    ...Array.from(text.matchAll(/\b(without\s+.+?)(?=\s+(?:then|and|but)\b|$)/gi)).map(match => match[1]?.trim()),
  ].filter((clause): clause is string => Boolean(clause));
  return clauses.length > 0 ? clauses : undefined;
}

export function interpretPlayerAction(
  description: string,
  simulation: SimulationState,
  risk: RiskLevel = 'medium',
): ProposedAction {
  const normalized = description.trim();
  if (!normalized) throw new Error('Player action must not be empty.');
  const lower = normalized.toLowerCase();

  const kind = KEYWORDS.find(([, keywords]) => includesAny(lower, keywords))?.[0] ?? 'other';
  const destinationId = kind === 'travel' ? inferDestination(lower, simulation) : undefined;
  const targetId = ['talk', 'attack', 'inspect', 'stealth'].includes(kind)
    ? inferTarget(lower, simulation)
    : undefined;
  const approach = inferApproach(lower);
  const techniqueId = kind === 'attack' || kind === 'meditate' || kind === 'train' ? inferTechnique(lower, simulation) : undefined;
  const intendedGoal = inferGoal(normalized, simulation);
  const conditionalClauses = inferConditionalClauses(lower);
  const declaredConstraints = inferDeclaredConstraints(lower);
  const duration = kind === 'rest' || kind === 'meditate' ? inferDuration(lower, simulation) : undefined;

  return {
    kind,
    description: normalized,
    actorId: simulation.character.id,
    risk,
    riskPosture: risk,
    ...(destinationId ? { destinationId } : {}),
    ...(targetId ? { targetId } : {}),
    ...(approach ? { approach } : {}),
    ...(techniqueId ? { techniqueId } : {}),
    ...(duration ? { timeCost: duration } : {}),
    ...(intendedGoal ? { intendedGoal } : {}),
    ...(conditionalClauses ? { conditionalClauses } : {}),
    ...(declaredConstraints ? { declaredConstraints } : {}),
  };
}
