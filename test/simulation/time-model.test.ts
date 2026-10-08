import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePlayerAction } from '../../src/engine/actionPipeline';
import { choiceCandidates, generateChoices, isHonourable } from '../../src/ai/choiceGenerator';
import { fallbackNarration } from '../../src/ai/fallbackNarrator';
import { interpretPlayerAction } from '../../src/engine/actionInterpreter';
import { DEFAULT_CLOCK, TICKS_PER_DAY, describeDuration, describeTime, ticksUntilPhase, timeAt, timeOf, validClock } from '../../src/engine/clock';
import { journeyTicks } from '../../src/engine/environment';
import { buildNarratorDigest } from '../../src/engine/narratorDigest';
import { resolveAction } from '../../src/engine/resolveAction';
import { isAsleep, nextAwakePhase } from '../../src/engine/routine';
import type { SimulationState } from '../../src/engine/types';
import { validateState } from '../../src/engine/validateState';
import { weatherOn } from '../../src/engine/weather';
import { TRANSIT_LOCATION, routeTicks } from '../../src/engine/worldMap';
import type { GameState } from '../../src/types/game';
import {
  FANTASY_PRESETS, LOCATIONS, NPC_PROFILES, TRAVEL_EDGES, buildChoiceContext, buildDigestOptions, buildWorldMap,
  createOriginCharacter, createWuxiaSimulation, findOrigin, upgradeWuxiaWorld,
} from '../../src/world/content';

const options = buildDigestOptions();
const ctx = buildChoiceContext();
const disciple = () => createWuxiaSimulation('origin-disgraced-disciple'); // The Crossroads, morning of day 12, autumn
const run = (sim: SimulationState, text: string, roll = 60, risk: 'low' | 'medium' | 'high' = 'low') => resolveAction(sim, interpretPlayerAction(text, sim, risk), roll);
const npc = (sim: SimulationState, id: string) => sim.jianghu!.npcs.find(n => n.id === id)!;
const atTick = (sim: SimulationState, tickOfDay: number) => { const s = JSON.parse(JSON.stringify(sim)) as SimulationState; s.world.turn = tickOfDay - sim.world.clock!.startTickOfDay + TICKS_PER_DAY * 3; return s; };

test('the clock is derived from one counter: phases, dates, seasons and years roll over correctly', () => {
  assert.deepStrictEqual(timeAt(0).phase, 'morning');
  assert.equal(describeTime(timeAt(0)), 'Morning, day 12 of autumn');
  const phases = Array.from({ length: 6 }, (_, i) => timeAt(i).phase);
  assert.deepStrictEqual(phases, ['morning', 'afternoon', 'evening', 'night', 'late_night', 'dawn']);
  assert.equal(timeAt(4).isNight && timeAt(3).isNight && !timeAt(0).isNight, true);
  assert.equal(timeAt(0).season, 'autumn');
  assert.equal(timeAt(19 * TICKS_PER_DAY).season, 'winter'); // day 12 + 19 = day 31
  assert.equal(timeAt(19 * TICKS_PER_DAY).dayOfSeason, 1);
  const yearTwo = timeAt(100 * TICKS_PER_DAY);
  assert.deepStrictEqual([yearTwo.season, yearTwo.dayOfSeason, yearTwo.year], ['summer', 22, 1]);
  for (let t = 0; t < 2000; t += 7) { const w = timeAt(t); assert.ok(w.dayOfSeason >= 1 && w.dayOfSeason <= 30 && w.tickOfDay >= 0 && w.tickOfDay < 6); }
  assert.equal(timeAt(-5).tick, 0);
  assert.equal(ticksUntilPhase({ turn: 0 }, 'dawn'), 5);
  assert.equal(ticksUntilPhase({ turn: 0 }, 'morning'), 6, 'a full day when it is already that phase');
  assert.ok(validClock(DEFAULT_CLOCK));
  for (const bad of [{ ...DEFAULT_CLOCK, daysPerSeason: 0 }, { ...DEFAULT_CLOCK, startDayOfSeason: 31 }, { ...DEFAULT_CLOCK, startTickOfDay: 6 }, { ...DEFAULT_CLOCK, startSeason: 'monsoon' as never }]) assert.equal(validClock(bad), false);
});

test('durations are put into plain words', () => {
  assert.deepStrictEqual([1, 3, 6, 9, 12, 14, 17].map(describeDuration), ['about 4 hours', 'about 12 hours', 'a day', 'a day and a half', 'two days', 'a little over two days', 'nearly three days']);
  assert.equal(describeDuration(0), 'no time at all');
});

test('the authored map becomes engine data: symmetric routes, triangle inequality, real distances', () => {
  const map = buildWorldMap(true);
  const ids = LOCATIONS.map(l => l.id);
  for (const a of ids) for (const b of ids) {
    const d = routeTicks(map, a, b);
    assert.ok(d !== undefined, `${a} -> ${b}`);
    assert.equal(d, routeTicks(map, b, a));
    for (const via of ids) assert.ok(d <= routeTicks(map, a, via)! + routeTicks(map, via, b)!, `${a}-${via}-${b}`);
  }
  assert.equal(routeTicks(map, 'The Crossroads', 'Lantern Ferry'), 6);
  assert.equal(routeTicks(map, 'The Crossroads', 'Moonwell Grove'), 30);
  assert.equal(routeTicks(map, 'The Crossroads', 'The Crossroads'), 0);
  assert.equal(routeTicks(map, 'The Crossroads', 'Nowhere'), undefined);
  assert.equal(routeTicks(undefined, 'a', 'b'), undefined);
  assert.equal(TRAVEL_EDGES.length, map.edges.length);
  assert.ok(!buildWorldMap(false).edges.some(e => [e.a, e.b].some(id => id === 'Moonwell Grove' || id === 'Sunken Archive')));
});

test('weather is a pure function of (seed, day, season, climate), lasts in spells, and fits the climate', () => {
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) for (const climate of ['temperate', 'mountain', 'marsh', 'cold', 'river', 'forest'] as const) {
    for (let day = 0; day < 40; day++) assert.equal(weatherOn(day, season, climate, 77).kind, weatherOn(day, season, climate, 77).kind);
  }
  assert.equal(weatherOn(40, 'autumn', 'river', 9).kind, weatherOn(41, 'autumn', 'river', 9).kind, 'two-day spells');
  const tally = (season: 'summer' | 'winter', climate: 'temperate' | 'cold') => {
    const t: Record<string, number> = {};
    for (let day = 0; day < 4000; day += 2) { const k = weatherOn(day, season, climate, 5).kind; t[k] = (t[k] ?? 0) + 1; }
    return t;
  };
  assert.equal(tally('summer', 'temperate').snow ?? 0, 0);
  assert.equal(tally('summer', 'temperate').blizzard ?? 0, 0);
  assert.ok((tally('winter', 'cold').blizzard ?? 0) > (tally('winter', 'temperate').blizzard ?? 0));
  assert.ok((tally('winter', 'cold').snow ?? 0) > 400);
  const seeds = new Set(Array.from({ length: 40 }, (_, seed) => weatherOn(10, 'autumn', 'temperate', seed).kind));
  assert.ok(seeds.size >= 3, 'different seeds give different skies');
});

test('journeys follow the map and are stretched by bad weather; a mapless world stays instant', () => {
  const sim = disciple();
  const clear = { ...sim, world: { ...sim.world } };
  const trip = journeyTicks(clear, 'The Crossroads', 'Lantern Ferry')!;
  assert.equal(trip.baseTicks, 6);
  assert.ok(trip.ticks >= 6 && trip.ticks <= 12);
  assert.equal(trip.delayed, trip.ticks > 6);
  // Find a day whose weather slows the road, and one that does not, by sweeping the calendar.
  const seen = new Set<number>();
  for (let day = 0; day < 120; day += 2) { const s = atTick(sim, 2); s.world.turn = day * 6; seen.add(journeyTicks(s, 'The Crossroads', 'Lantern Ferry')!.ticks); }
  assert.ok(seen.has(6) && [...seen].some(t => t > 6), `ticks seen: ${[...seen]}`);
  const bare = { world: { turn: 0, locationIds: ['a', 'b'], knownFacts: [] } };
  assert.equal(journeyTicks(bare, 'a', 'b')!.ticks, 1);
});

test('travel takes exactly the journey time: the clock moves, the player is on the road, then arrives', () => {
  const sim = disciple();
  const trip = journeyTicks(sim, 'The Crossroads', 'Lantern Ferry')!;
  const r = run(sim, 'Travel to Lantern Ferry', 95);
  assert.equal(r.status, 'success');
  assert.equal(r.state.world.turn - sim.world.turn, trip.ticks);
  assert.equal(r.state.character.locationId, 'Lantern Ferry');
  const moved = r.events.find(e => e.type === 'world.location_changed')!;
  assert.equal(moved.payload.ticks, trip.ticks);
  assert.deepStrictEqual(validateState(r.state), []);
  const digest = buildNarratorDigest(r, options);
  assert.ok(digest.includes('The journey took'));
  assert.ok(/Time: (Dawn|Morning|Afternoon|Evening|Night|The small hours), day \d+ of autumn\./.test(digest));
  assert.ok(/you arrive at Lantern Ferry/i.test(fallbackNarration(r, options)));
});

test('a failed journey costs one tick and leaves you where you were', () => {
  const sim = disciple();
  const r = run(sim, 'Travel to Lantern Ferry', 1, 'high');
  assert.notEqual(r.status, 'success');
  assert.equal(r.state.character.locationId, 'The Crossroads');
  assert.equal(r.state.world.turn - sim.world.turn, 1);
});

test('travel with no road on a mapped world is blocked and costs no time', () => {
  const sim = disciple();
  sim.world.locationIds.push('Island');
  sim.world.map!.places!['Island'] = {};
  const r = run(sim, 'Travel to Island', 95);
  assert.equal(r.status, 'blocked');
  assert.match(r.summary, /no road/);
  assert.equal(r.state.world.turn, sim.world.turn);
});

test('while travelling you are nowhere: a finale at the destination is not witnessed and nothing is learned', () => {
  const sim = disciple();
  sim.jianghu!.worldEvents.push({
    id: 'event-test-ferry', kind: 'political', title: 'Ferry meeting', description: 'A meeting at the ferry.', locationId: 'Lantern Ferry',
    factionIds: [], severity: 2, active: true, createdTurn: 0, pace: { steps: 1, interval: 2 },
    finale: { outcomes: [{ id: 'done', headline: 'The meeting breaks up.', description: 'People drift away.', when: [], effects: [
      { kind: 'spread_rumor', id: 'rumor-test-meeting', text: 'The ferry meeting broke up.', origin: 'npc-ma-tie', locationIds: ['Lantern Ferry'], credibility: 80 }] }] },
  });
  const r = run(sim, 'Travel to Lantern Ferry', 95);
  const finale = r.events.find(e => e.type === 'world.finale_resolved');
  assert.ok(finale, 'the finale happens during the journey');
  assert.equal(finale.payload.witnessedByPlayer, false);
  assert.deepStrictEqual(finale.witnesses, []);
  assert.ok(!r.state.jianghu!.knowledgeRecords!.some(k => k.sourceId === 'event-test-ferry'));
  assert.ok(!buildNarratorDigest(r, options).includes('The meeting breaks up'));
  assert.ok(!r.state.world.knownRumorIds!.includes('rumor-test-meeting-lantern-ferry'));
});

test('time passes during a journey: the world ticks every step, and no tick sees the player at a place they have not reached', () => {
  const sim = disciple();
  const r = run(sim, 'Travel to Moonwell Grove', 95);
  assert.equal(r.status, 'success');
  assert.ok(r.state.world.turn - sim.world.turn >= 30);
  const ticks = r.events.filter(e => e.type === 'world.jianghu_ticked');
  assert.equal(ticks.length, r.state.world.turn - sim.world.turn);
  assert.equal(r.state.character.locationId, 'Moonwell Grove');
  assert.ok(r.state.jianghu!.markets!.every(m => m.locationId !== TRANSIT_LOCATION), 'no market grows on the road');
  assert.deepStrictEqual(validateState(r.state), []);
});

test('sleep: people are asleep in the small hours by default, explicit routines override, and the sleeping cannot be talked to', () => {
  const sim = disciple();
  const keeper = npc(sim, 'npc-teahouse-keeper'); const ma = npc(sim, 'npc-ma-tie'); const mo = npc(sim, 'npc-archivist-mo');
  assert.equal(isAsleep(keeper, 'late_night'), true);
  assert.equal(isAsleep(keeper, 'morning'), false);
  assert.equal(isAsleep(ma, 'morning'), true, 'Captain Ma sleeps by day');
  assert.equal(isAsleep(ma, 'late_night'), false, 'and works the pier at night');
  assert.equal(isAsleep(mo, 'late_night'), false, 'the archivist never sleeps');
  assert.deepStrictEqual(['dawn', 'morning', 'afternoon', 'evening', 'night'].map(p => isAsleep(keeper, p as never)), [false, false, false, false, false]);
  assert.equal(nextAwakePhase(ma, 'dawn'), 'afternoon');
  assert.equal(nextAwakePhase(keeper, 'late_night'), 'dawn');
  const night = atTick(sim, 0);
  const blocked = run(night, 'Talk to Old Tea Keeper');
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.summary, /is asleep/);
  assert.equal(blocked.state.world.turn, night.world.turn, 'a blocked action takes no time');
  assert.ok(buildNarratorDigest(blocked, options).includes('The action did not happen: Old Tea Keeper is asleep.'));
  assert.ok(fallbackNarration(blocked, options).includes('No time passes.'));
  assert.ok(buildNarratorDigest(blocked, options).includes('Old Tea Keeper (tea house keeper) [asleep]'));
});

test('the sleeping can be waited for: rest until they wake, then the conversation works', () => {
  const ferry = createWuxiaSimulation('origin-escort-apprentice');
  const morning = atTick(ferry, 2);
  assert.equal(run(morning, 'Talk to Captain Ma Tie').status, 'blocked');
  const waited = run(morning, 'Rest until afternoon');
  assert.equal(waited.state.world.turn - morning.world.turn, 1);
  assert.equal(timeOf(waited.state.world).phase, 'afternoon');
  assert.equal(run(waited.state, 'Talk to Captain Ma Tie', 60).status, 'success');
});

test('a person who is somewhere else cannot be talked to, whatever the clock says', () => {
  const r = run(disciple(), 'Talk to Captain Ma Tie', 95);
  assert.equal(r.status, 'blocked');
  assert.match(r.summary, /not here/);
});

test('players say how long, in their own words: until a time, overnight, for a span, and bounded', () => {
  const sim = disciple(); // morning
  const ticks = (text: string) => interpretPlayerAction(text, sim).timeCost;
  assert.equal(ticks('Rest until dawn'), 5);
  assert.equal(ticks('Wait until evening'), 2);
  assert.equal(ticks('Sleep overnight'), 5);
  assert.equal(ticks('Rest through the night'), 5);
  assert.equal(ticks('Rest for two days'), 12);
  assert.equal(ticks('Wait for a watch'), 1);
  assert.equal(ticks('Rest for a day'), 6);
  assert.equal(ticks('Meditate until midnight'), 4);
  assert.equal(ticks('Rest for 40 days'), 24, 'capped at four days');
  assert.equal(ticks('Rest'), undefined, 'no duration named keeps the default');
  assert.equal(run(sim, 'Rest').state.world.turn - sim.world.turn, 2);
  assert.equal(run(sim, 'Meditate quietly').state.world.turn - sim.world.turn, 1);
  for (const t of ['Talk to Old Tea Keeper', 'Inspect the notice wall']) assert.equal(interpretPlayerAction(t, sim).timeCost, undefined);
});

test('words that merely contain a keyword no longer change what you meant (forest, camphor, interest)', () => {
  const sim = disciple();
  for (const [text, kind] of [['Inspect the camphor tree shrine', 'inspect'], ['Look at the forest edge', 'inspect'], ['Ask about the crest on the gate', 'talk'], ['Examine the interesting carving', 'inspect']] as const) {
    assert.equal(interpretPlayerAction(text, sim).kind, kind, text);
  }
  assert.equal(interpretPlayerAction('Make camp for the night', sim).kind, 'rest');
  assert.equal(interpretPlayerAction('Rest by the fire', sim).kind, 'rest');
});

test('rest scales with the time spent: a long rest heals and refreshes more, and wounds close with the days', () => {
  const sim = disciple(); sim.character.hp = 40; sim.character.fatigue = 90;
  sim.character.wuxia!.injuries.push({ id: 'w', severity: 2, bodyRegion: 'torso', healingTurns: 14, untreated: true });
  const short = run(sim, 'Rest for a watch'); const long = run(sim, 'Rest for two days');
  assert.ok(long.state.character.hp > short.state.character.hp);
  assert.ok(long.state.character.fatigue < short.state.character.fatigue);
  assert.equal(long.state.character.fatigue, 0);
  assert.equal(long.state.character.wuxia!.injuries.length, 0, 'two days of rest closes a fresh wound');
  assert.equal(short.state.character.wuxia!.injuries.length, 1);
  const med = run(disciple(), 'Meditate until midnight');
  assert.ok(med.state.character.qi >= disciple().character.qi);
});

test('long journeys tire you far more than short ones, and a storm tires you more than a clear day', () => {
  const sim = disciple();
  const short = run(sim, 'Travel to Lantern Ferry', 95); const long = run(sim, 'Travel to Moonwell Grove', 95);
  assert.ok(long.state.character.fatigue > short.state.character.fatigue);
  assert.ok(long.state.character.fatigue <= 100);
});

test('darkness helps the sneaking and hinders the looking; talking is unaffected (weather removed by staying indoors)', () => {
  const base = disciple(); base.world.map!.places!['The Crossroads'].indoors = true;
  const at = (text: string, tickOfDay: number) => run(atTick(base, tickOfDay), text, 60, 'medium').difficulty;
  assert.equal(at('Sneak past the tea house', 5) - at('Sneak past the tea house', 2), -10);
  assert.equal(at('Inspect the notice wall', 5) - at('Inspect the notice wall', 2), 10);
  assert.equal(at('Talk to Old Tea Keeper', 5), at('Talk to Old Tea Keeper', 2));
});

test('weather changes the difficulty outdoors and not indoors', () => {
  const sim = disciple();
  let found = false;
  for (let day = 0; day < 200 && !found; day++) {
    const s = atTick(sim, 2); s.world.turn = day * 6;
    const w = weatherOn(timeOf(s.world).day, timeOf(s.world).season, 'temperate', s.world.rng!.seed).kind;
    if (w !== 'storm' && w !== 'fog') continue;
    const outdoors = run(s, 'Inspect the notice wall', 60, 'medium').difficulty;
    const inside = JSON.parse(JSON.stringify(s)) as SimulationState; inside.world.map!.places!['The Crossroads'].indoors = true;
    const sheltered = run(inside, 'Inspect the notice wall', 60, 'medium').difficulty;
    assert.equal(outdoors - sheltered, 10, `${w}`);
    found = true;
  }
  assert.ok(found, 'a stormy or foggy day exists in 200 days');
});

test('worlds without a calendar (older saves, bare fixtures) feel no day, night or weather', () => {
  const sim = disciple(); delete sim.world.clock;
  const diffs = new Set<number>(); let allowed = true;
  for (let tick = 0; tick < 36; tick++) {
    const s = JSON.parse(JSON.stringify(sim)) as SimulationState; s.world.turn = tick;
    diffs.add(run(s, 'Inspect the notice wall', 60, 'medium').difficulty);
    allowed = allowed && run(s, 'Talk to Captain Ma Tie').status !== undefined && run(s, 'Talk to Old Tea Keeper').status !== 'blocked';
  }
  assert.equal(diffs.size, 1);
  assert.ok(allowed, 'nobody is asleep in a world with no calendar');
});

test('NPCs with no routine do not wander: the old teleporting is gone', () => {
  let sim = disciple();
  const where = (id: string) => npc(sim, id).locationId;
  const before = { gu: where('npc-gu-wen'), bai: where('npc-bai-qingshan'), zhao: where('npc-zhao-rong'), mian: where('npc-su-mian') };
  for (let i = 0; i < 12; i++) sim = run(sim, 'Rest for a day').state; // 72 ticks, player never leaves the crossroads
  assert.equal(where('npc-bai-qingshan'), before.bai);
  assert.equal(where('npc-zhao-rong'), before.zhao);
  assert.equal(where('npc-wandering-swordsman'), 'The Crossroads');
  void before.gu; void before.mian;
});

test('NPC errands take real time: Su Mian sets out when her goal opens, is on the road, then arrives and settles there', () => {
  let sim = createWuxiaSimulation('origin-ferry-orphan');
  const moves: Array<{ tick: number; arriving: boolean; seen: boolean }> = [];
  for (let i = 0; i < 120 && sim.world.turn < 100; i++) {
    const r = run(sim, 'Wait for a watch');
    for (const e of r.events) if (e.type === 'world.npc_moved' && e.payload.npcId === 'npc-su-mian') moves.push({ tick: r.state.world.turn, arriving: e.payload.arriving === true, seen: e.witnesses!.includes('player') });
    sim = r.state;
    const su = npc(sim, 'npc-su-mian');
    if (su.transit) { assert.equal(su.locationId, TRANSIT_LOCATION); assert.ok(!buildNarratorDigest(r, options).includes('Su Mian (ferry singer)'), 'not visible on the road'); }
    assert.deepStrictEqual(validateState(sim), []);
  }
  assert.equal(moves[0].arriving, false);
  assert.ok(moves[0].tick >= 42, `she waits for her goal to open: ${moves[0].tick}`);
  assert.equal(moves[0].seen, true, 'the player at the ferry sees her leave');
  assert.equal(moves[1].arriving, true);
  assert.ok(moves[1].tick - moves[0].tick >= 30, 'the journey takes days');
  assert.equal(moves[1].seen, false, 'and the arrival is not witnessed from afar');
  const su = npc(sim, 'npc-su-mian');
  assert.equal(su.locationId, 'Moonwell Grove');
  assert.equal(su.homeId, 'Moonwell Grove');
  assert.equal(su.routine, undefined);
  assert.equal(moves.length, 2, 'settled: she does not commute back');
});

test('the digest tells the narrator who arrives and who leaves, only when the player could see it', () => {
  let sim = createWuxiaSimulation('origin-ferry-orphan'); let said = ''; let unseen = true;
  for (let i = 0; i < 70 && !said; i++) {
    const r = run(sim, 'Wait for a watch'); sim = r.state;
    const d = buildNarratorDigest(r, options);
    if (d.includes('Su Mian sets out for Moonwell Grove.')) said = d;
    if (r.events.some(e => e.type === 'world.npc_moved' && !e.witnesses!.includes('player')) && d.includes('sets out')) unseen = false;
  }
  assert.ok(said);
  assert.ok(unseen);
});

test('choices respect the clock: never suggest talking to the sleeping, offer to wait for them, and offer rest at night', () => {
  for (const origin of ['origin-escort-apprentice', 'origin-ferry-orphan', 'origin-disgraced-disciple']) {
    for (let tickOfDay = 0; tickOfDay < 6; tickOfDay++) {
      const s = atTick(createWuxiaSimulation(origin), tickOfDay);
      const phase = timeOf(s.world).phase;
      const choices = generateChoices(s, ctx);
      assert.equal(choices.length, 5, `${origin}@${phase}`);
      for (const c of choices) {
        assert.ok(isHonourable(c.text, c.risk, s), c.text);
        const action = interpretPlayerAction(c.text, s, c.risk);
        if (action.kind === 'talk') assert.ok(!isAsleep(npc(s, action.targetId!), phase), `${origin}@${phase}: ${c.text}`);
        assert.notEqual(resolveAction(s, action, 60).status, 'blocked', `${origin}@${phase}: ${c.text}`);
      }
      if (timeOf(s.world).isNight) assert.ok(choices.some(c => c.text === 'Rest until dawn') || choiceCandidates(s, ctx).some(c => c.text === 'Rest until dawn'));
    }
  }
  const morningFerry = atTick(createWuxiaSimulation('origin-escort-apprentice'), 2);
  morningFerry.jianghu!.npcs = morningFerry.jianghu!.npcs.filter(n => n.id === 'npc-ma-tie' || n.locationId !== 'Lantern Ferry');
  assert.ok(choiceCandidates(morningFerry, ctx).some(c => /^Rest until afternoon when Captain Ma Tie will be up/.test(c.text)));
});

test('a legacy save is upgraded in place: calendar, roads and routines arrive, story changes survive, and it is idempotent', () => {
  const fresh = disciple();
  const old = JSON.parse(JSON.stringify(fresh)) as SimulationState;
  delete old.world.clock; delete old.world.map;
  for (const n of old.jianghu!.npcs) { delete n.homeId; delete n.routine; }
  const gu = npc(old, 'npc-gu-wen'); gu.homeId = 'Cloudstep Peak'; gu.locationId = 'Cloudstep Peak'; // relocated by the story
  const upgraded = upgradeWuxiaWorld(old);
  assert.deepStrictEqual(upgraded.world.clock, fresh.world.clock);
  assert.deepStrictEqual(upgraded.world.map, fresh.world.map);
  assert.deepStrictEqual(npc(upgraded, 'npc-ma-tie').routine, npc(fresh, 'npc-ma-tie').routine);
  assert.equal(npc(upgraded, 'npc-gu-wen').homeId, 'Cloudstep Peak');
  assert.equal(npc(upgraded, 'npc-gu-wen').routine, undefined);
  assert.deepStrictEqual(upgradeWuxiaWorld(upgraded), upgraded);
  assert.deepStrictEqual(validateState(upgraded), []);
  assert.equal(JSON.stringify(old.world.clock), undefined, 'the input is not mutated');
});

test('state validation rejects a corrupt clock or map', () => {
  const bad = (mutate: (s: SimulationState) => void) => { const s = disciple(); mutate(s); return validateState(s).length > 0; };
  assert.ok(bad(s => { s.world.clock!.startTickOfDay = 9; }));
  assert.ok(bad(s => { s.world.map!.edges[0].ticks = 0; }));
  assert.ok(bad(s => { s.world.map!.edges.push({ a: 'The Crossroads', b: 'Atlantis', ticks: 6 }); }));
  assert.ok(bad(s => { s.world.map!.places!['Atlantis'] = {}; }));
  assert.ok(!bad(() => {}));
});

test('the live pipeline counts actions, not ticks, in turnCount, and the whole trip is replayable from the seed', () => {
  const play = () => {
    const origin = findOrigin('origin-disgraced-disciple')!;
    const simulation = createWuxiaSimulation(origin.id, FANTASY_PRESETS.living_legends, 'T', 4242);
    let game: GameState = { character: createOriginCharacter(origin, 'T', 'c', 'living_legends'), turns: [], currentScene: '', location: simulation.character.locationId, questLog: [], relationships: [], isGameStarted: true, isGameOver: false, turnCount: 0, simulation };
    const script = ['Talk to Old Tea Keeper', 'Rest until dawn', 'Travel to Lantern Ferry', 'Rest until afternoon', 'Talk to Captain Ma Tie', 'Travel to The Crossroads', 'Rest for a day', 'Travel to Jade Hall', 'Practice the Azure River Sword', 'Meditate until midnight'];
    const ticks: number[] = [];
    for (const text of script) {
      const before = game.simulation!.world.turn;
      game = resolvePlayerAction(game, text, 'low').nextGameState;
      ticks.push(game.simulation!.world.turn - before);
      assert.deepStrictEqual(validateState(game.simulation!), []);
    }
    assert.equal(game.turnCount, script.length);
    assert.ok(game.simulation!.world.turn > script.length * 2, 'many more ticks than actions');
    return { json: JSON.stringify(game.simulation), ticks };
  };
  const a = play(); const b = play();
  assert.equal(a.json, b.json);
  assert.deepStrictEqual(a.ticks, b.ticks);
});

test('every origin x every NPC x each phase of the day: any action leaves a valid world and takes at least one tick unless blocked', () => {
  let checked = 0;
  for (const origin of ['origin-disgraced-disciple', 'origin-escort-apprentice', 'origin-ferry-orphan', 'origin-wandering-physician', 'origin-frontier-deserter']) {
    for (let tickOfDay = 0; tickOfDay < 6; tickOfDay++) {
      const s = atTick(createWuxiaSimulation(origin), tickOfDay);
      for (const p of NPC_PROFILES) {
        const copy = JSON.parse(JSON.stringify(s)) as SimulationState; npc(copy, p.npc.id).locationId = copy.character.locationId;
        for (const text of [`Talk to ${p.npc.name}`, `Challenge ${p.npc.name} to a friendly duel`, 'Rest until dawn', 'Travel to The Crossroads', 'Sneak past everyone']) {
          const before = JSON.stringify(copy);
          const r = run(copy, text, 55, 'medium');
          assert.equal(JSON.stringify(copy), before, 'input mutated');
          assert.deepStrictEqual(validateState(r.state), [], `${origin}/${tickOfDay}/${p.npc.id}/${text}`);
          if (r.status !== 'blocked') assert.ok(r.state.world.turn > copy.world.turn, text);
          else assert.equal(r.state.world.turn, copy.world.turn);
          checked++;
        }
      }
    }
  }
  assert.ok(checked >= 1000);
});
