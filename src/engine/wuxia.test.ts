import { resolveAction } from './resolveAction';
import type { SimulationState } from './types';
import { createDefaultWuxiaCharacter } from './wuxia';

function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

const baseCharacter = createDefaultWuxiaCharacter({
  id: 'hero',
  name: 'Jiang',
  hp: 100,
  maxHp: 100,
  qi: 10,
  maxQi: 100,
  fatigue: 0,
  attributes: {
    strength: 10,
    agility: 10,
    constitution: 10,
    perception: 10,
    intelligence: 10,
    charisma: 10,
    luck: 10,
  },
  conditions: [],
  inventory: [],
  locationId: 'road',
});

const state: SimulationState = {
  schemaVersion: 1,
  character: baseCharacter,
  world: {
    turn: 0,
    locationIds: ['road'],
    knownFacts: [],
  },
};

{
  const result = resolveAction(state, {
    kind: 'meditate',
    description: 'Circulate Qi through the meridians.',
    risk: 'low',
  }, 50);

  equal(result.status, 'success', 'meditation should succeed');
  if (result.state.character.qi <= state.character.qi) throw new Error('meditation should restore Qi');
  if (!result.state.character.wuxia) throw new Error('Wuxia state should persist');
  equal(result.state.character.wuxia!.cultivation.accumulatedInsight, 1, 'meditation should add insight');
}

{
  const result = resolveAction(state, {
    kind: 'attack',
    description: 'Attempt a dangerous attack.',
    risk: 'high',
  }, 0);

  equal(result.status, 'failure', 'low roll should fail');
  if (!result.state.character.wuxia!.injuries.some(injury => injury.id.startsWith('backlash-'))) {
    throw new Error('high-risk failed attack should create backlash injury');
  }
}

{
  const result = resolveAction(state, {
    kind: 'talk',
    description: 'Speak respectfully with the stranger.',
    risk: 'low',
  }, 99);

  equal(result.status, 'success', 'high-roll talk should succeed');
  equal(result.state.character.wuxia!.social.trust, 1, 'successful talk should increase trust');
}

console.log('Wuxia foundations tests passed.');
