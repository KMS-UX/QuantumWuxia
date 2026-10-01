import { advanceCausalityV5 } from './jianghuCausalityV5';
import { createDefaultJianghu } from './jianghu';
import type { SimulationState } from './types';

function state(turn = 5): SimulationState {
  return {
    schemaVersion: 1,
    ledger: [],
    character: { id: 'player', name: 'Tester', hp: 100, maxHp: 100, qi: 50, maxQi: 50, fatigue: 0,
      attributes: { strength: 10, agility: 10, constitution: 10, perception: 10, intelligence: 10, charisma: 10, luck: 10 },
      conditions: [], inventory: [], locationId: 'The Crossroads' },
    world: { turn, locationIds: ['The Crossroads'], knownFacts: [], knownRumorIds: [], knownNpcIds: [] },
  };
}
test('high-severity faction chains escalate concrete faction state', () => {
  const j = createDefaultJianghu();
  j.worldEvents.push({ id: 'e1', kind: 'conflict', title: 'Conflict', description: 'A conflict grows', factionIds: ['faction-jade-hall'], severity: 4, active: true, createdTurn: 5, locationId: 'The Crossroads' });
  j.causalChains!.push({ id: 'c1', rootEventId: 'e1', step: 0, kind: 'faction', description: 'Conflict', sourceIds: ['e1'], active: true, createdTurn: 5, nextCheckTurn: 5 });
  const before = j.factions[0].internalTension;
  const result = advanceCausalityV5(j, state());
  expect(result.jianghu.factions[0].internalTension).toBeGreaterThan(before);
  expect(result.events.some(e => e.type === 'world.causal_branch_selected')).toBe(true);
});
test('de-escalation reduces market scarcity and ends a resolved chain', () => {
  const j = createDefaultJianghu();
  j.worldEvents.push({ id: 'e2', kind: 'market', title: 'Market', description: 'Supply issue', factionIds: [], severity: 1, active: true, createdTurn: 5, locationId: 'The Crossroads' });
  j.causalChains!.push({ id: 'c2', rootEventId: 'e2', step: 0, kind: 'economic', description: 'Market', sourceIds: ['e2'], active: true, createdTurn: 5, nextCheckTurn: 5 });
  const before = j.markets![0].scarcity.tea;
  const result = advanceCausalityV5(j, state());
  expect(result.jianghu.markets![0].scarcity.tea).toBeLessThanOrEqual(before);
  expect(result.jianghu.worldEvents.find(e => e.id === 'e2')?.active).toBe(false);
});
test('knowledge can be deterministically verified', () => {
  const j = createDefaultJianghu();
  j.worldEvents.push({ id: 'e3', kind: 'rumor', title: 'Rumor', description: 'The river is unsafe', factionIds: [], severity: 2, active: true, createdTurn: 5, locationId: 'The Crossroads' });
  j.rumors.push({ id: 'e3', text: 'The river is unsafe', origin: 'npc-teahouse-keeper', currentLocationId: 'The Crossroads', status: 'false', credibility: 10, knownBy: ['player'], createdTurn: 5, spreadRate: 1 });
  j.knowledgeRecords!.push({ id: 'k1', subjectId: 'player', fact: 'The river is unsafe', sourceId: 'e3', sourceKind: 'rumor', confidence: 50, discoveredTurn: 5, trueState: 'unknown' });
  j.causalChains!.push({ id: 'c3', rootEventId: 'e3', step: 0, kind: 'information', description: 'Rumor', sourceIds: ['e3'], active: true, createdTurn: 5, nextCheckTurn: 5 });
  const result = advanceCausalityV5(j, state());
  expect(result.jianghu.knowledgeRecords![0].trueState).toBe('false');
});
test('location reactions expire deterministically', () => {
  const j = createDefaultJianghu();
  j.worldEvents.push({ id: 'e4', kind: 'personal', title: 'Trouble', description: 'Trouble', factionIds: [], severity: 3, active: true, createdTurn: 5, locationId: 'The Crossroads' });
  j.causalChains!.push({ id: 'c4', rootEventId: 'e4', step: 0, kind: 'personal', description: 'Trouble', sourceIds: ['e4'], active: true, createdTurn: 5, nextCheckTurn: 5 });
  const result = advanceCausalityV5(j, state());
  expect(result.jianghu.locationConditions?.[0].active).toBe(true);
  const laterInput = { ...result.jianghu, worldEvents: result.jianghu.worldEvents.map(event => ({ ...event, active: false })) };
  const later = advanceCausalityV5(laterInput, state(9));
  expect(later.jianghu.locationConditions?.length).toBe(0);
});
