import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretPlayerAction } from '../../src/engine/actionInterpreter';
import { applyFinale, conditionHolds, selectFinaleOutcome, validateFinaleSpec, type FinaleSpec } from '../../src/engine/finale';
import { advanceCausalChains } from '../../src/engine/jianghuInformationV4';
import { buildNarratorDigest } from '../../src/engine/narratorDigest';
import { resolveAction } from '../../src/engine/resolveAction';
import { timeOf } from '../../src/engine/clock';
import { isAsleep } from '../../src/engine/routine';
import type { SimulationState } from '../../src/engine/types';
import { validateState } from '../../src/engine/validateState';
import {
  FINALES, NPC_PROFILES, buildDigestOptions, createWuxiaJianghu, createWuxiaSimulation, wuxiaLocationIds,
} from '../../src/world/content';

const options = buildDigestOptions();
const fresh = (origin = 'origin-disgraced-disciple') => createWuxiaSimulation(origin);

/** Collect every finale (including nested follow-ups) as [eventId, spec]. */
function allFinales(): Array<[string, FinaleSpec]> {
  const out: Array<[string, FinaleSpec]> = [];
  const visit = (id: string, spec: FinaleSpec) => {
    out.push([id, spec]);
    for (const o of spec.outcomes) for (const e of o.effects) if (e.kind === 'start_event' && e.event.finale) visit(e.event.id, e.event.finale);
  };
  for (const [id, spec] of Object.entries(FINALES)) visit(id, spec);
  return out;
}

test('every authored finale is structurally valid and every reference resolves', () => {
  const j = createWuxiaJianghu();
  const locations = wuxiaLocationIds();
  for (const [id, spec] of allFinales()) assert.deepStrictEqual(validateFinaleSpec(spec, j, locations), [], id);
  assert.ok(allFinales().length >= 7);
});

test('forcing every outcome of every finale applies all of its effects (nothing silently skipped)', () => {
  for (const [id, spec] of allFinales()) {
    for (const outcome of spec.outcomes) {
      const sim = fresh();
      const j = sim.jianghu!;
      const event = { id, kind: 'political' as const, title: 't', description: 'd', factionIds: [], severity: 2, active: true, createdTurn: 0, locationId: 'Jade Hall', finale: { outcomes: [{ ...outcome, when: [] }] } };
      j.worldEvents.push(event);
      const result = applyFinale(j, sim, event);
      assert.equal(result.event?.payload.effectsSkipped, 0, `${id}/${outcome.id}`);
      assert.equal(event.active, false);
    }
  }
});

test('finale outcome selection is deterministic: first match wins, the unconditional last outcome is the default', () => {
  const sim = fresh(); const j = sim.jianghu!;
  const spec = FINALES['event-autumn-assembly'];
  j.factions.find(f => f.id === 'faction-jade-hall')!.internalTension = 10;
  assert.equal(selectFinaleOutcome(spec, j, sim)?.id, 'heir-named');
  j.factions.find(f => f.id === 'faction-jade-hall')!.internalTension = 60;
  assert.equal(selectFinaleOutcome(spec, j, sim)?.id, 'hall-schism');
  assert.equal(selectFinaleOutcome(spec, j, sim)?.id, selectFinaleOutcome(spec, j, sim)?.id);
});

test('conditions treat unknown ids as false rather than throwing', () => {
  const sim = fresh();
  for (const c of [
    { kind: 'npc_alive', npcId: 'nobody' }, { kind: 'faction_tension_at_least', factionId: 'nobody', value: 0 },
    { kind: 'market_scarcity_at_least', locationId: 'nowhere', good: 'x', value: 0 }, { kind: 'faction_hostility_at_least', factionAId: 'a', factionBId: 'b', value: 0 },
    { kind: 'npc_disposition_at_least', npcId: 'nobody', value: -100 },
  ] as const) assert.equal(conditionHolds(c, sim.jianghu!, sim), false);
});

test('passive play unfolds as a cascade: blockade, epidemic, schism, and each follow-up resolves', () => {
  let state = fresh();
  const outcomes: Record<string, { turn: number; outcome: string }> = {};
  for (let t = 1; t <= 90; t++) {
    const r = resolveAction(state, interpretPlayerAction(t % 3 ? 'Rest' : 'Meditate quietly', state, 'low'), 60);
    state = r.state;
    assert.deepStrictEqual(validateState(state), [], `turn ${t}`);
    for (const e of r.events) if (e.type === 'world.finale_resolved') outcomes[String(e.payload.eventId)] = { turn: t, outcome: String(e.payload.outcomeId) };
  }
  assert.equal(outcomes['event-toll-dispute']?.outcome, 'ferry-blockade');
  assert.equal(outcomes['event-fever-season']?.outcome, 'fever-epidemic');
  assert.equal(outcomes['event-autumn-assembly']?.outcome, 'hall-schism');
  for (const follow of ['event-ferry-blockade', 'event-medicine-shortage', 'event-jade-hall-schism']) assert.ok(outcomes[follow], `${follow} should resolve`);
  assert.ok(outcomes['event-ferry-blockade'].turn > outcomes['event-toll-dispute'].turn);
  assert.equal(state.jianghu!.worldEvents.filter(e => e.active).length, 0);
});

test('a finale fires exactly once and ends its event', () => {
  let state = fresh(); let fired = 0;
  for (let t = 1; t <= 60; t++) {
    const r = resolveAction(state, interpretPlayerAction('Rest', state, 'low'), 60); state = r.state;
    fired += r.events.filter(e => e.type === 'world.finale_resolved' && e.payload.eventId === 'event-toll-dispute').length;
  }
  assert.equal(fired, 1);
  assert.ok(!state.jianghu!.worldEvents.some(e => e.id === 'event-toll-dispute'));
});

test('a player who earned trust and is present changes the outcome, and witnesses it', () => {
  // Real play: start at the ferry and keep talking to Captain Ma. The dispute sours local moods as it
  // builds (goodwill decays over the middle stages), so trust has to be maintained, not just earned once.
  let state = createWuxiaSimulation('origin-escort-apprentice');
  let finale: Record<string, string | number | boolean | null> | undefined; let digest = '';
  for (let t = 1; t <= 40 && !finale; t++) {
    // Captain Ma sleeps through the morning, so talk only when he is up.
    const ma = state.jianghu!.npcs.find(n => n.id === 'npc-ma-tie')!;
    const awake = !isAsleep(ma, timeOf(state.world).phase);
    const text = awake && (state.world.turn <= 9 || state.world.turn >= 15) ? 'Talk to Captain Ma Tie' : 'Rest';
    const r = resolveAction(state, interpretPlayerAction(text, state, 'low'), 60); state = r.state;
    const e = r.events.find(ev => ev.type === 'world.finale_resolved' && ev.payload.eventId === 'event-toll-dispute');
    if (e) { finale = e.payload; digest = buildNarratorDigest(r, options); }
  }
  assert.ok(finale, 'toll finale should fire');
  assert.equal(finale!.outcomeId, 'toll-mediated');
  assert.equal(finale!.witnessedByPlayer, true);
  assert.ok(digest.includes('A decisive moment unfolded before you'));
  assert.ok(digest.includes('capped toll'));
  const record = state.jianghu!.knowledgeRecords!.find(k => k.sourceId === 'event-toll-dispute');
  assert.equal(record?.sourceKind, 'observation');
  assert.ok(state.world.knownRumorIds!.includes('rumor-toll-capped-lantern-ferry'));
  assert.deepStrictEqual(validateState(state), []);
});

test('an absent player is not told: no witness, no digest line, and the news only exists as rumor', () => {
  let state = fresh(); // starts at The Crossroads, never travels
  let digestLines = '';
  for (let t = 1; t <= 25; t++) {
    const r = resolveAction(state, interpretPlayerAction('Rest', state, 'low'), 60); state = r.state;
    const e = r.events.find(ev => ev.type === 'world.finale_resolved');
    if (e) { assert.equal(e.payload.witnessedByPlayer, false); assert.deepStrictEqual(e.witnesses, []); digestLines += buildNarratorDigest(r, options); }
  }
  assert.ok(!digestLines.includes('A decisive moment'));
  assert.ok(!state.jianghu!.knowledgeRecords!.some(k => k.sourceKind === 'observation'));
  const blockade = state.jianghu!.rumors.find(r => r.id === 'rumor-ferry-blockade-the-crossroads');
  assert.ok(blockade, 'news should reach the crossroads');
  assert.ok(blockade.knownBy.includes('npc-teahouse-keeper'), 'the tea keeper has heard');
  assert.ok(!blockade.knownBy.includes('player'));
});

test('foreshadowing: a local event with a finale says it is nearing, fuzzily and without leaking numbers or secrets', () => {
  let state = createWuxiaSimulation('origin-escort-apprentice');
  let sawSoon = false;
  for (let t = 1; t <= 20; t++) {
    const r = resolveAction(state, interpretPlayerAction('Rest', state, 'low'), 60); state = r.state;
    const d = buildNarratorDigest(r, options);
    if (d.includes('come to a head')) {
      sawSoon = true;
      assert.ok(!/\d+ turns?/.test(d));
      for (const p of NPC_PROFILES) for (const secret of p.npc.secrets) assert.ok(!d.includes(secret));
    }
  }
  assert.ok(sawSoon);
});

test('a finale cannot recreate an event that already exists (cascades are bounded by unique ids)', () => {
  const sim = fresh(); const j = sim.jianghu!;
  const spec: FinaleSpec = { outcomes: [{ id: 'o', headline: 'h', description: 'd', when: [], effects: [
    { kind: 'start_event', event: { id: 'event-toll-dispute', kind: 'conflict', title: 'dup', description: 'dup', factionIds: [], severity: 1 } }] }] };
  const event = { id: 'event-x', kind: 'conflict' as const, title: 'x', description: 'x', factionIds: [], severity: 1, active: true, createdTurn: 0, finale: spec };
  j.worldEvents.push(event);
  const before = j.worldEvents.length;
  const result = applyFinale(j, sim, event);
  assert.equal(result.event?.payload.effectsSkipped, 1);
  assert.equal(j.worldEvents.length, before);
});

test('events without a finale keep the old behaviour: chain completes, event stays active', () => {
  const sim = fresh(); const j = sim.jianghu!;
  j.worldEvents = [{ id: 'plain', kind: 'conflict', title: 'p', description: 'p', factionIds: [], severity: 1, active: true, createdTurn: 0, locationId: 'The Crossroads' }];
  let cur = j;
  for (let t = 1; t <= 6; t++) { sim.world.turn = t; cur = advanceCausalChains(cur, sim).jianghu; }
  assert.equal(cur.worldEvents[0].active, true);
  assert.equal(cur.causalChains!.find(c => c.rootEventId === 'plain')!.active, false);
});
