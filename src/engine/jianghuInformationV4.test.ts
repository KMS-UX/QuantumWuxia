import test from 'node:test';
import { expect } from '../../test/support/expect';
import { advanceCausalChains, processInformation, recordKnowledge } from './jianghuInformationV4';
import { createDefaultJianghu, createRumor } from './jianghu';
import type { SimulationState } from './types';

function state(turn = 5): SimulationState {
  return {
    schemaVersion: 1,
    ledger: [],
    character: {
      id: 'player', name: 'Tester', hp: 100, maxHp: 100, qi: 50, maxQi: 50, fatigue: 0,
      attributes: { strength: 10, agility: 10, constitution: 10, perception: 10, intelligence: 10, charisma: 10, luck: 10 },
      conditions: [], inventory: [], locationId: 'The Crossroads',
    },
    world: { turn, locationIds: ['The Crossroads'], knownFacts: [], knownRumorIds: [], knownNpcIds: [] },
  };
}

test('knowledge records preserve provenance and confidence', () => {
  const input = createDefaultJianghu();
  const result = recordKnowledge(input, 'player', 'A hidden route exists', 'npc-teahouse-keeper', 'npc', 72, 5);
  const record = result.knowledgeRecords?.[0];
  expect(record?.sourceId).toBe('npc-teahouse-keeper');
  expect(record?.sourceKind).toBe('npc');
  expect(record?.confidence).toBe(72);
});

test('known rumors become explicit player knowledge records', () => {
  let input = createDefaultJianghu();
  input = createRumor(input, 'Bandits are active near the river.', 'npc-teahouse-keeper', 'The Crossroads', 1, 80);
  input.rumors[0].knownBy.push('player');
  const sim = state();
  const result = processInformation(input, sim);
  expect(result.jianghu.knowledgeRecords?.some(k => k.sourceId === input.rumors[0].id && k.subjectId === 'player')).toBe(true);
  expect(sim.world.knownRumorIds).toContain(input.rumors[0].id);
});

test('active world events advance one causal step per eligible turn', () => {
  const input = createDefaultJianghu();
  input.worldEvents.push({
    id: 'event-rumor-1', kind: 'rumor', title: 'A dangerous rumor spreads',
    description: 'A rumor is gaining traction.', factionIds: [], severity: 2,
    active: true, createdTurn: 5, expiresTurn: 9, locationId: 'The Crossroads',
  });
  // A chain is registered on first sighting and becomes eligible on the next turn.
  const registered = advanceCausalChains(input, state(5));
  expect(registered.jianghu.causalChains?.find(c => c.rootEventId === 'event-rumor-1')?.step).toBe(0);
  const result = advanceCausalChains(registered.jianghu, state(6));
  const chain = result.jianghu.causalChains?.find(c => c.rootEventId === 'event-rumor-1');
  expect(chain?.step).toBe(1);
  expect(result.events.some(e => e.type === 'world.causal_chain_advanced')).toBe(true);
});

test('causal chains are bounded, complete once, and never respawn', () => {
  let input = createDefaultJianghu();
  input.worldEvents.push({
    id: 'event-social-1', kind: 'personal', title: 'Old grievance',
    description: 'A grievance remains unresolved.', factionIds: [], severity: 1,
    active: true, createdTurn: 5, expiresTurn: 20, locationId: 'The Crossroads',
  });
  for (let turn = 5; turn <= 14; turn++) {
    input = advanceCausalChains(input, state(turn)).jianghu;
  }
  const chains = input.causalChains?.filter(c => c.rootEventId === 'event-social-1') ?? [];
  expect(chains).toHaveLength(1);
  expect(chains[0].active).toBe(false);
  expect(chains[0].step).toBe(3);
});
