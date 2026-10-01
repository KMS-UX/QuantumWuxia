import { applyCausalityV3, createObligation } from './jianghuCausalityV3';
import { createDefaultJianghu } from './jianghu';
import type { SimulationState } from './types';

function fixture(): SimulationState {
  return {
    schemaVersion: 1,
    ledger: [],
    character: {
      id: 'player',
      name: 'Tester',
      hp: 100,
      maxHp: 100,
      qi: 50,
      maxQi: 50,
      fatigue: 0,
      attributes: { strength: 10, agility: 10, constitution: 10, perception: 10, intelligence: 10, charisma: 10, luck: 10 },
      conditions: [],
      inventory: [],
      locationId: 'The Crossroads',
    },
    world: { turn: 10, locationIds: ['The Crossroads'], knownFacts: [], knownRumorIds: [], knownNpcIds: [] },
  };
}

test('v3 creates NPC-to-NPC relationships without mutating input', () => {
  const input = createDefaultJianghu();
  const before = JSON.stringify(input);
  const result = applyCausalityV3(input, fixture());
  expect(JSON.stringify(input)).toBe(before);
  expect(result.jianghu.relationships.some(r => r.subjectId.startsWith('npc-') && r.targetId.startsWith('npc-'))).toBe(true);
});

test('overdue obligations create deterministic social pressure', () => {
  let world = createDefaultJianghu();
  world = createObligation(world, {
    debtorId: 'npc-wandering-swordsman',
    creditorId: 'npc-teahouse-keeper',
    description: 'Repay the tea keeper',
    kind: 'debt',
    severity: 6,
    fulfilled: false,
    createdTurn: 1,
    dueTurn: 5,
  });
  const result = applyCausalityV3(world, fixture());
  const rel = result.jianghu.relationships.find(r => r.subjectId === 'npc-wandering-swordsman' && r.targetId === 'npc-teahouse-keeper');
  expect(rel?.trust).toBeLessThan(0);
});

test('local market derives prices from scarcity', () => {
  const result = applyCausalityV3(createDefaultJianghu(), fixture());
  const market = result.jianghu.markets?.find(m => m.locationId === 'The Crossroads');
  expect(market).toBeDefined();
  expect((market?.priceMultipliers.medicine ?? 0)).toBeGreaterThan(1);
  expect(result.events.some(e => e.type === 'world.market_changed')).toBe(true);
});

test('autonomous NPC work is bounded', () => {
  const result = applyCausalityV3(createDefaultJianghu(), fixture());
  const actions = result.events.filter(e => e.type === 'world.npc_action');
  expect(actions.length).toBeLessThanOrEqual(3);
});
