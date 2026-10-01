import type { ProposedAction, RiskLevel, SimulationState } from './types';

const KEYWORDS: Array<[ProposedAction['kind'], string[]]> = [
  ['travel', ['travel', 'go ', 'head ', 'follow ', 'enter ', 'leave ', 'return ', 'move ']],
  ['attack', ['attack', 'fight', 'strike', 'hit ', 'ambush', 'kill ', 'duel']],
  ['stealth', ['sneak', 'hide', 'creep', 'stealth', 'slip past', 'conceal']],
  ['meditate', ['meditate', 'cultivate', 'focus qi', 'circulate qi', 'breathe']],
  ['rest', ['rest', 'sleep', 'wait quietly', 'recover', 'catch my breath']],
  ['talk', ['talk', 'speak', 'ask ', 'question', 'negotiate', 'call out', 'persuade']],
  ['inspect', ['inspect', 'examine', 'search', 'look ', 'read ', 'listen', 'study', 'investigate']],
];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
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

function inferTechnique(text: string): string | undefined {
  const match = text.match(/(?:use|with|using)\s+([a-z0-9_-]+(?:\s+[a-z0-9_-]+){0,2})/i);
  return match?.[1]?.trim();
}

function inferGoal(text: string): string | undefined {
  const match = text.match(/(?:to|so that|in order to)\s+(.+)$/i);
  return match?.[1]?.trim();
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
  const techniqueId = kind === 'attack' || kind === 'meditate' ? inferTechnique(lower) : undefined;
  const intendedGoal = inferGoal(normalized);

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
    ...(intendedGoal ? { intendedGoal } : {}),
  };
}
