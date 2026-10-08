import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretPlayerAction } from '../../src/engine/actionInterpreter';
import { chainPace, createDefaultJianghu, tickJianghu, type JianghuState, type WorldEventState } from '../../src/engine/jianghu';
import { advanceCausalChains } from '../../src/engine/jianghuInformationV4';
import { advanceCausalityV5 } from '../../src/engine/jianghuCausalityV5';
import { resolveAction } from '../../src/engine/resolveAction';
import type { SimulationState } from '../../src/engine/types';
import { validateState } from '../../src/engine/validateState';
import { createWuxiaSimulation } from '../../src/world/content';

function sim(turn: number): SimulationState {
  return {
    schemaVersion: 1, ledger: [],
    character: { id: 'player', name: 'T', hp: 100, maxHp: 100, qi: 50, maxQi: 50, fatigue: 0,
      attributes: { strength: 10, agility: 10, constitution: 10, perception: 10, intelligence: 10, charisma: 10, luck: 10 },
      conditions: [], inventory: [], locationId: 'The Crossroads' },
    world: { turn, locationIds: ['The Crossroads'], knownFacts: [], knownRumorIds: [], knownNpcIds: [] },
  };
}
const event = (extra: Partial<WorldEventState> = {}): WorldEventState => ({
  id: 'ev', kind: 'conflict', title: 't', description: 'd', factionIds: ['faction-jade-hall'], severity: 2,
  active: true, createdTurn: 1, locationId: 'The Crossroads', ...extra,
});
function run(j: JianghuState, from: number, to: number) {
  const advancedOn: number[] = []; const completedOn: number[] = [];
  for (let t = from; t <= to; t++) {
    const r = advanceCausalChains(j, sim(t)); j = r.jianghu;
    if (r.events.some(e => e.type === 'world.causal_chain_advanced')) advancedOn.push(t);
    if (r.events.some(e => e.type === 'world.causal_chain_completed')) completedOn.push(t);
  }
  return { j, advancedOn, completedOn };
}

test('chainPace defaults to the original 3 stages one turn apart and clamps extremes', () => {
  assert.deepStrictEqual(chainPace({}), { steps: 3, interval: 1, custom: false });
  assert.deepStrictEqual(chainPace({ pace: { steps: 999, interval: 0 } }), { steps: 12, interval: 1, custom: true });
  assert.deepStrictEqual(chainPace({ pace: { steps: -4, interval: 99 } }), { steps: 1, interval: 20, custom: true });
});

test('events without a pace behave exactly as before: 3 consecutive stages', () => {
  const j = createDefaultJianghu(); j.worldEvents.push(event());
  const out = run(j, 5, 14);
  assert.deepStrictEqual(out.advancedOn, [6, 7, 8]);
  assert.deepStrictEqual(out.completedOn, [8]);
});

test('a paced chain advances once per interval and completes exactly after its last stage', () => {
  const j = createDefaultJianghu(); j.worldEvents.push(event({ pace: { steps: 4, interval: 5 } }));
  const out = run(j, 1, 60);
  assert.deepStrictEqual(out.advancedOn, [6, 11, 16, 21]);
  assert.deepStrictEqual(out.completedOn, [21]);
  const chains = out.j.causalChains!.filter(c => c.rootEventId === 'ev');
  assert.equal(chains.length, 1);
  assert.equal(chains[0].active, false);
});

test('middle stages of a paced faction chain keep raising tension, bounded at 100', () => {
  const j = createDefaultJianghu(); j.worldEvents.push(event({ severity: 5, pace: { steps: 12, interval: 1 } }));
  const before = j.factions.find(f => f.id === 'faction-jade-hall')!.internalTension;
  const out = run(j, 1, 40);
  const after = out.j.factions.find(f => f.id === 'faction-jade-hall')!.internalTension;
  assert.ok(after > before && after <= 100, `${before} -> ${after}`);
  assert.equal(out.j.causalChains!.find(c => c.rootEventId === 'ev')!.step, 12);
});

test('V5 honours the same pace for cadence and completion', () => {
  const j = createDefaultJianghu();
  j.worldEvents.push(event({ severity: 4, pace: { steps: 2, interval: 6 } }));
  j.causalChains!.push({ id: 'c', rootEventId: 'ev', step: 0, kind: 'faction', description: 'd', sourceIds: ['ev'], active: true, createdTurn: 1, nextCheckTurn: 1 });
  const first = advanceCausalityV5(j, sim(1));
  assert.equal(first.jianghu.causalChains![0].nextCheckTurn, 7);
  assert.equal(first.jianghu.causalChains![0].active, true);
  const second = advanceCausalityV5(first.jianghu, sim(7));
  assert.equal(second.jianghu.causalChains![0].active, false);
});

test('faction tension no longer drains every turn: it holds during an active event and cools slowly otherwise', () => {
  const j = createDefaultJianghu();
  const faction = j.factions.find(f => f.id === 'faction-jade-hall')!;
  faction.internalTension = 40;
  j.worldEvents = [event()];
  let cur = j;
  for (let t = 1; t <= 12; t++) cur = tickJianghu(cur, sim(t)).jianghu;
  assert.equal(cur.factions.find(f => f.id === 'faction-jade-hall')!.internalTension, 40);
  cur.worldEvents = [];
  for (let t = 13; t <= 24; t++) cur = tickJianghu(cur, sim(t)).jianghu;
  assert.equal(cur.factions.find(f => f.id === 'faction-jade-hall')!.internalTension, 36);
});

test('authored seed events unfold on their authored timescale and stay valid for 70 ticks', () => {
  let state = createWuxiaSimulation('origin-disgraced-disciple');
  const completed: Record<string, number> = {}; const firstStage: Record<string, number> = {};
  for (let i = 0; state.world.turn < 70 && i < 200; i++) {
    const action = interpretPlayerAction(i % 3 ? 'Rest' : 'Meditate quietly', state, 'low');
    const r = resolveAction(state, action, 60);
    for (const e of r.events) {
      const id = String(e.payload.rootEventId);
      if (e.type === 'world.causal_chain_advanced') firstStage[id] ??= r.state.world.turn;
      if (e.type === 'world.causal_chain_completed') completed[id] = r.state.world.turn;
    }
    state = r.state;
    assert.deepStrictEqual(validateState(state), [], `tick ${state.world.turn}`);
    for (const f of state.jianghu!.factions) assert.ok(f.internalTension >= 0 && f.internalTension <= 100);
  }
  assert.ok(firstStage['event-toll-dispute'] >= 4, 'toll dispute should not escalate in the first few ticks');
  assert.ok(completed['event-toll-dispute'] >= 16, `toll dispute resolved too fast: ${completed['event-toll-dispute']}`);
  assert.ok(completed['event-autumn-assembly'] >= 40, `assembly resolved too fast: ${completed['event-autumn-assembly']}`);
  assert.ok(state.jianghu!.factions.find(f => f.id === 'faction-jade-hall')!.internalTension > 25, 'Jade Hall tension should persist');
});
