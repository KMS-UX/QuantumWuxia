import { applyJianghuAction, createDefaultJianghu, createRumor, tickJianghu } from './jianghu';
import { createDefaultWuxiaCharacter } from './wuxia';
import type { ProposedAction, SimulationState } from './types';

function fixture(): SimulationState {
  const base = {
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
  };
  return {
    schemaVersion: 1,
    character: { ...base, wuxia: createDefaultWuxiaCharacter(base).wuxia },
    world: { turn: 3, locationIds: ['The Crossroads'], knownFacts: [], knownRumorIds: [], knownNpcIds: [] },
  };
}

test('talk records an NPC memory and relationship', () => {
  const simulation = fixture();
  const action: ProposedAction = { kind: 'talk', description: 'Ask the tea keeper about local dangers', targetId: 'npc-teahouse-keeper', risk: 'low' };
  const result = applyJianghuAction(createDefaultJianghu(), simulation, action);
  expect(result.jianghu.relationships[0].trust).toBe(1);
  expect(result.jianghu.npcs[0].memories).toHaveLength(1);
});

test('tick is immutable and evolves faction pressure', () => {
  const input = createDefaultJianghu();
  const before = JSON.stringify(input);
  const result = tickJianghu(input, fixture());
  expect(JSON.stringify(input)).toBe(before);
  expect(result.jianghu.factions).toHaveLength(input.factions.length);
});

test('NPC attack creates a persistent grudge', () => {
  const simulation = fixture();
  const action: ProposedAction = { kind: 'attack', description: 'Strike the swordsman', targetId: 'npc-wandering-swordsman', risk: 'high' };
  const result = applyJianghuAction(createDefaultJianghu(), simulation, action);
  const relationship = result.jianghu.relationships[0];
  expect(relationship.grudge).toBe(5);
  expect(relationship.trust).toBe(-10);
});

test('rumors propagate to local NPCs and player knowledge', () => {
  const simulation = fixture();
  let world = createRumor(createDefaultJianghu(), 'A bandit chief was seen nearby.', 'npc-teahouse-keeper', 'The Crossroads', 1, 80);
  const result = tickJianghu(world, simulation);
  expect(result.jianghu.rumors[0].knownBy).toContain('npc-wandering-swordsman');
});

test('NPC goals advance during world ticks', () => {
  const result = tickJianghu(createDefaultJianghu(), fixture());
  const swordsman = result.jianghu.npcs.find(npc => npc.id === 'npc-wandering-swordsman');
  expect(swordsman?.goals.some(goal => goal.progress > 0)).toBe(true);
});

test('world truth is separate from player knowledge', () => {
  const simulation = fixture();
  const world = createDefaultJianghu();
  const result = tickJianghu(createRumor(world, 'Secret meeting tonight.', 'npc-teahouse-keeper', 'The Crossroads', 1, 30), simulation);
  expect(result.jianghu.rumors[0].text).toBe('Secret meeting tonight.');
  expect(simulation.world.knownRumorIds ?? []).not.toContain(result.jianghu.rumors[0].id);
});
