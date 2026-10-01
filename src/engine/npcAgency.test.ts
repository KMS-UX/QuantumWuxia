import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  createNpcPlan,
  emitNpcAgencyEvent,
  evaluateNpcOpportunity,
  executeNpcPlan,
  selectNpcGoal,
} from './npcAgency';
import { createDefaultJianghu } from './jianghu';

const simulation = {
  schemaVersion: 1 as const,
  character: {
    id: 'hero-1',
    name: 'Hero',
    hp: 100,
    maxHp: 100,
    qi: 50,
    maxQi: 50,
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
    locationId: 'The Crossroads',
  },
  world: {
    turn: 1,
    locationIds: ['The Crossroads'],
    knownFacts: [],
  },
  ledger: [],
};

test('NPC agency selects the highest-priority active goal deterministically', () => {
  const jianghu = createDefaultJianghu();
  const npc = jianghu.npcs[1];

  const goal = selectNpcGoal(npc);

  assert.equal(goal?.id, 'goal-repay-debt');
  assert.equal(goal?.priority, 90);
});

test('NPC agency separates goal, plan, opportunity, action, and consequence', () => {
  const jianghu = createDefaultJianghu();
  const npc = jianghu.npcs[0];
  const goal = npc.goals.find(candidate => candidate.kind === 'protect')!;
  const plan = createNpcPlan(npc, goal);

  const opportunity = evaluateNpcOpportunity(jianghu, npc, plan, simulation);
  assert.equal(opportunity.available, false);

  const forcedPlan = createNpcPlan(npc, {
    ...goal,
    kind: 'travel',
    targetId: 'The Crossroads',
  });
  const travelOpportunity = evaluateNpcOpportunity(jianghu, npc, forcedPlan, simulation);
  assert.equal(travelOpportunity.available, false);
});

test('NPC travel action deterministically completes its goal and emits a causal event', () => {
  const jianghu = createDefaultJianghu();
  const npc = jianghu.npcs[0];
  const goal = {
    ...npc.goals[0],
    kind: 'travel' as const,
    targetId: 'The Crossroads',
    active: true,
    progress: 0,
  };
  npc.goals = [goal];

  const plan = createNpcPlan(npc, goal);
  const opportunity = evaluateNpcOpportunity(
    jianghu,
    npc,
    { ...plan, targetId: 'A distant village' },
    simulation,
  );
  assert.equal(opportunity.available, true);

  const result = executeNpcPlan(
    jianghu,
    npc,
    { ...plan, targetId: 'A distant village' },
    opportunity,
    simulation.world.turn,
    (state, subjectId, targetId) => {
      const relationship = state.relationships.find(
        value => value.subjectId === subjectId && value.targetId === targetId,
      );
      return relationship ?? { debt: 0, grudge: 0 };
    },
    (state, locationId) => {
      const market = state.markets!.find(value => value.locationId === locationId)!;
      return market;
    },
  );

  assert.equal(result.acted, true);
  assert.equal(npc.locationId, 'A distant village');
  assert.equal(goal.active, false);
  assert.equal(goal.progress, 100);

  const event = emitNpcAgencyEvent(result, npc, simulation.world.turn);
  assert.equal(event?.type, 'world.npc_action');
  assert.deepEqual(event?.causes, [
    'npc:npc-teahouse-keeper:goal:goal-tea-open',
    'npc:npc-teahouse-keeper:opportunity',
  ]);
});
