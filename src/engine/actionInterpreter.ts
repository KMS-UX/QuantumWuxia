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

function inferTarget(text: string, simulation: SimulationState): string | undefined {\n  const npc = simulation.jianghu?.npcs.find(person => text.includes(person.name.toLowerCase()));\n  return npc?.id;\n}\n\nfunction inferDestination(text: string, simulation: SimulationState): string | undefined {
  return simulation.world.locationIds.find(id => text.includes(id.toLowerCase()));
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
  const destinationId = kind === 'travel' ? inferDestination(lower, simulation) : undefined;\n  const targetId = ['talk', 'attack', 'inspect', 'stealth'].includes(kind) ? inferTarget(lower, simulation) : undefined;

  return {
    kind,
    description: normalized,
    risk,
    ...(destinationId ? { destinationId } : {}),\n    ...(targetId ? { targetId } : {}),
  };
}
