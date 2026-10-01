import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretPlayerAction } from '../../src/engine/actionInterpreter';
import { resolveAction } from '../../src/engine/resolveAction';
import { validateState } from '../../src/engine/validateState';
import {
  ARTS_BY_ID, FACTIONS, FANTASY_PRESETS, LOCATIONS, MARTIAL_ARTS, NPC_PROFILES, ORIGINS, RUMORS, TRAVEL_EDGES,
  createWuxiaJianghu, createWuxiaSimulation, instantiateArt, originsFor, travelDays,
} from '../../src/world/content';

const locationIds = new Set(LOCATIONS.map(l => l.id));
const npcIds = new Set(NPC_PROFILES.map(p => p.npc.id));
const factionIds = new Set(FACTIONS.map(f => f.id));

test('every cross-reference in the authored content resolves', () => {
  for (const edge of TRAVEL_EDGES) {
    assert.ok(locationIds.has(edge.a) && locationIds.has(edge.b), `edge ${edge.a}-${edge.b}`);
    assert.ok(edge.days > 0);
  }
  for (const { npc } of NPC_PROFILES) {
    assert.ok(locationIds.has(npc.locationId), `${npc.id} location`);
    if (npc.factionId) assert.ok(factionIds.has(npc.factionId), `${npc.id} faction`);
    for (const g of npc.goals) if (g.targetId) assert.ok(locationIds.has(g.targetId) || npcIds.has(g.targetId), `${g.id} target`);
  }
  for (const f of FACTIONS) {
    f.territory.forEach(t => assert.ok(locationIds.has(t), `${f.id} territory ${t}`));
    [...f.allies, ...f.enemies].forEach(id => assert.ok(factionIds.has(id), `${f.id} ref ${id}`));
  }
  for (const r of RUMORS) {
    assert.ok(locationIds.has(r.currentLocationId));
    r.knownBy.forEach(id => assert.ok(npcIds.has(id), `${r.id} knownBy ${id}`));
  }
  for (const { art } of MARTIAL_ARTS) {
    [...(art.compatibleArts ?? []), ...(art.incompatibleArts ?? [])].forEach(id => assert.ok(ARTS_BY_ID[id], `${art.id} ref ${id}`));
    assert.ok(art.rank >= 1 && art.rank <= 9);
  }
  for (const o of ORIGINS) {
    assert.ok(locationIds.has(o.startLocationId));
    o.arts.forEach(a => assert.ok(ARTS_BY_ID[a.id], `${o.id} art ${a.id}`));
    assert.equal(o.openingChoices.length, 5, `${o.id} must offer exactly five suggestions`);
  }
});

test('the travel graph is fully connected and symmetric', () => {
  for (const a of LOCATIONS) for (const b of LOCATIONS) {
    const d = travelDays(a.id, b.id);
    assert.ok(d !== undefined, `${a.id} -> ${b.id} unreachable`);
    assert.equal(d, travelDays(b.id, a.id));
  }
});

test('martial art compatibility is mutually consistent', () => {
  for (const { art } of MARTIAL_ARTS) {
    for (const other of art.incompatibleArts ?? []) {
      const back = ARTS_BY_ID[other].art;
      assert.ok(back.incompatibleArts?.includes(art.id), `${art.id} <-> ${other} not mutual`);
    }
  }
});

test('createWuxiaJianghu is deterministic and returns independent copies', () => {
  const a = createWuxiaJianghu();
  const b = createWuxiaJianghu();
  assert.deepStrictEqual(a, b);
  a.npcs[0].name = 'MUTATED';
  a.factions[0].territory.push('nowhere');
  assert.notEqual(createWuxiaJianghu().npcs[0].name, 'MUTATED');
  assert.ok(!createWuxiaJianghu().factions[0].territory.includes('nowhere'));
});

test('the pure-wuxia preset removes every supernatural element', () => {
  const pure = FANTASY_PRESETS.pure_wuxia;
  const jianghu = createWuxiaJianghu({ fantasy: pure });
  const fantasyNpcs = NPC_PROFILES.filter(p => p.fantasy).map(p => p.npc.id);
  assert.ok(fantasyNpcs.length > 0);
  for (const id of fantasyNpcs) assert.ok(!jianghu.npcs.some(n => n.id === id));
  assert.ok(!jianghu.rumors.some(r => r.id === 'rumor-ghost-singer'));
  const sim = createWuxiaSimulation('origin-wandering-physician', pure);
  assert.ok(!sim.world.locationIds.includes('Moonwell Grove'));
  assert.throws(() => createWuxiaSimulation('origin-relic-bearer', pure), /supernatural layer/);
  assert.ok(originsFor(false).every(o => !o.fantasy));
});

test('instantiateArt returns independent, bounded copies', () => {
  const art = instantiateArt('art-azure-river-sword', 250);
  assert.equal(art.mastery, 100);
  art.techniques[0].name = 'MUTATED';
  assert.notEqual(ARTS_BY_ID['art-azure-river-sword'].art.techniques[0].name, 'MUTATED');
  assert.throws(() => instantiateArt('art-nope'), /Unknown martial art/);
});

test('every origin yields a valid state, and every opening choice resolves without invalidating it', () => {
  for (const origin of ORIGINS) {
    const start = createWuxiaSimulation(origin.id);
    assert.deepStrictEqual(validateState(start), [], `${origin.id} start state`);
    for (const choice of origin.openingChoices) {
      for (const roll of [0, 50, 99]) {
        const snapshot = JSON.stringify(start);
        const action = interpretPlayerAction(choice.intent, start, choice.risk);
        const result = resolveAction(start, action, roll);
        assert.equal(JSON.stringify(start), snapshot, `${origin.id}/${choice.label} mutated its input`);
        assert.deepStrictEqual(validateState(result.state), [], `${origin.id}/${choice.label}@${roll}`);
      }
    }
  }
});

test('a 25-turn scripted campaign stays valid and is reproducible', () => {
  const play = () => {
    let state = createWuxiaSimulation('origin-disgraced-disciple');
    const script = ['Talk to the Old Tea Keeper', 'Rest at the tea house', 'Travel to Lantern Ferry', 'Talk to Captain Ma Tie',
      'Meditate quietly', 'Inspect the toll house', 'Travel to The Crossroads', 'Talk to the Wandering Swordsman', 'Rest'];
    for (let turn = 0; turn < 25; turn++) {
      const action = interpretPlayerAction(script[turn % script.length], state, 'medium');
      state = resolveAction(state, action, (turn * 37) % 100).state;
      assert.deepStrictEqual(validateState(state), [], `turn ${turn}`);
    }
    return state;
  };
  assert.deepStrictEqual(play(), play());
});
