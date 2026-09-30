/**
 * Dependency-free test cases. Invoke this module in a TypeScript-capable
 * test harness; failures throw ordinary Errors so no test library is required.
 */
import { resolveAction } from './resolveAction';
import type { SimulationState } from './types';

function equal<T>(actual: T, expected: T, message = 'values should match'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}
function ok(value: unknown, message = 'expected truthy value'): void {
  if (!value) throw new Error(message);
}
function throws(fn: () => unknown, expected: new (...args: never[]) => Error): void {
  try { fn(); } catch (error) {
    if (error instanceof expected) return;
    throw new Error(`Expected ${expected.name}, got ${(error as Error)?.name ?? typeof error}`);
  }
  throw new Error(`Expected ${expected.name} to be thrown`);
}

const baseState = (): SimulationState => ({
  schemaVersion: 1,
  character: {
    id: 'hero-1',
    name: 'Lin',
    hp: 80,
    maxHp: 100,
    qi: 30,
    maxQi: 50,
    fatigue: 20,
    attributes: {
      strength: 10, agility: 10, constitution: 10,
      perception: 10, intelligence: 10, charisma: 10, luck: 0,
    },
    conditions: [],
    inventory: [],
    locationId: 'inn',
  },
  world: { turn: 0, locationIds: ['inn', 'market', 'mountain'], knownFacts: [] },
});

const inspect: Parameters<typeof resolveAction>[1] = {
  kind: 'inspect', description: 'Inspect the strange seal', targetId: 'seal-1', risk: 'low',
};

{
  const state = baseState();
  const result = resolveAction(state, inspect, 99);
  equal(result.status, 'success');
  equal(result.state.world.knownFacts.includes('inspected:seal-1'), true);
  equal(state.world.turn, 0, 'input state must not be mutated');
}
{
  const result = resolveAction(baseState(), inspect, 0);
  equal(result.status, 'failure');
}
{
  const result = resolveAction(baseState(), {
    kind: 'travel', description: 'Travel to a place outside the map',
    destinationId: 'moon', risk: 'low',
  }, 99);
  equal(result.status, 'blocked');
  equal(result.state.character.locationId, 'inn');
}
{
  throws(() => resolveAction(baseState(), inspect, 100), RangeError);
}
{
  const state = baseState();
  state.character.qi = 0;
  const result = resolveAction(state, {
    kind: 'attack', description: 'Use a Qi-consuming palm technique',
    targetId: 'bandit-1', risk: 'medium', qiCost: 5,
  }, 99);
  equal(result.status, 'blocked');
}
{
  const state = baseState();
  state.character.fatigue = 70;
  const result = resolveAction(state, {
    kind: 'rest', description: 'Rest until breathing steadies', risk: 'low',
  }, 0);
  equal(result.status, 'success');
  equal(result.state.character.fatigue, 45);
  ok(result.state.character.hp > state.character.hp);
}

console.log('Simulation Core v1 tests passed.');
