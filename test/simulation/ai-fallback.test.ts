import assert from 'node:assert/strict';
import test from 'node:test';
import { choiceCandidates, generateChoices, isHonourable, mergeChoices } from '../../src/ai/choiceGenerator';
import { fallbackNarration } from '../../src/ai/fallbackNarrator';
import { interpretPlayerAction } from '../../src/engine/actionInterpreter';
import { resolveAction } from '../../src/engine/resolveAction';
import { timeOf } from '../../src/engine/clock';
import { isAsleep } from '../../src/engine/routine';
import { validateProposedAction } from '../../src/engine/actionContract';
import { validateState } from '../../src/engine/validateState';
import {
  FANTASY_PRESETS, NPC_PROFILES, ORIGINS, buildChoiceContext, buildDigestOptions, createWuxiaSimulation,
} from '../../src/world/content';

const ctx = buildChoiceContext();
const options = buildDigestOptions();

test('generated choices are five, distinct, legal, and each does what its text says', () => {
  for (const origin of ORIGINS) {
    let state = createWuxiaSimulation(origin.id);
    for (let t = 0; t < 12; t++) {
      const candidates = choiceCandidates(state, ctx);
      const choices = generateChoices(state, ctx);
      assert.equal(choices.length, 5, `${origin.id} t${t}`);
      assert.equal(new Set(choices.map(c => c.text.toLowerCase())).size, 5);
      assert.deepStrictEqual(choices.map(c => c.id), [1, 2, 3, 4, 5]);
      candidates.slice(0, 5).forEach(c => {
        const action = interpretPlayerAction(c.text, state, c.risk);
        assert.equal(action.kind, c.intendedKind, `"${c.text}" read as ${action.kind}`);
        assert.deepStrictEqual(validateProposedAction(state, action), [], c.text);
        if (c.intendedKind === 'travel') assert.ok(action.destinationId && action.destinationId !== state.character.locationId, c.text);
        if (c.intendedKind === 'talk') assert.ok(action.targetId, c.text);
      });
      // Follow the first suggestion each turn; the world must stay valid.
      const next = interpretPlayerAction(choices[t % 5].text, state, choices[t % 5].risk);
      state = resolveAction(state, next, 60).state;
      assert.deepStrictEqual(validateState(state), []);
    }
  }
});

test('generated choices respect the fantasy setting: nothing supernatural when it is off', () => {
  const state = createWuxiaSimulation('origin-wandering-physician', FANTASY_PRESETS.pure_wuxia);
  for (let t = 0; t < 8; t++) {
    const texts = choiceCandidates(state, ctx).map(c => c.text).join('|');
    for (const banned of ['Moonwell Grove', 'Sunken Archive', 'Su Mian', 'Archivist Mo']) assert.ok(!texts.includes(banned), banned);
    state.world.turn = t;
  }
});

test('an approaching local finale is offered as a way to be present for it', () => {
  let state = createWuxiaSimulation('origin-escort-apprentice');
  let offered = false;
  for (let t = 1; t <= 20; t++) {
    state = resolveAction(state, interpretPlayerAction('Rest', state, 'low'), 60).state;
    if (generateChoices(state, ctx).some(c => c.text.startsWith('Watch and listen closely'))) offered = true;
  }
  assert.ok(offered);
  assert.ok(!generateChoices(createWuxiaSimulation('origin-frontier-deserter'), ctx).some(c => c.text.startsWith('Watch and listen')));
});

test('narrator suggestions the rules cannot honour are replaced; honourable ones are kept in order', () => {
  const state = createWuxiaSimulation('origin-disgraced-disciple');
  const proposed = [
    { id: 1, text: 'Travel to the Hidden Dragon Temple', risk: 'high' as const },
    { id: 2, text: 'Talk to the Old Tea Keeper', risk: 'low' as const },
    { id: 3, text: 'Travel to The Crossroads', risk: 'low' as const },
    { id: 4, text: 'Travel to Lantern Ferry', risk: 'medium' as const },
    { id: 5, text: 'Rest', risk: 'low' as const },
  ];
  assert.equal(isHonourable('Travel to the Hidden Dragon Temple', 'high', state), false);
  assert.equal(isHonourable('Travel to The Crossroads', 'low', state), false);
  const merged = mergeChoices(proposed, state, ctx);
  assert.equal(merged.length, 5);
  assert.deepStrictEqual(merged.map(c => c.id), [1, 2, 3, 4, 5]);
  assert.deepStrictEqual(merged.slice(0, 3).map(c => c.text), ['Talk to the Old Tea Keeper', 'Travel to Lantern Ferry', 'Rest']);
  assert.ok(merged.every(c => isHonourable(c.text, c.risk, state)));
  assert.equal(mergeChoices([], state, ctx).length, 5);
});

test('the fallback narrator describes every origin x opening choice x roll from the result alone, without leaks', () => {
  const secrets = NPC_PROFILES.flatMap(p => [...p.npc.secrets, ...p.npc.goals.map(g => g.description)]);
  for (const origin of ORIGINS) for (const choice of origin.openingChoices) for (const roll of [5, 50, 95]) {
    const sim = createWuxiaSimulation(origin.id);
    const result = resolveAction(sim, interpretPlayerAction(choice.intent, sim, choice.risk), roll);
    const text = fallbackNarration(result, options);
    assert.ok(text.length > 20 && text.length < 1500);
    assert.equal(text, fallbackNarration(result, options), 'deterministic');
    for (const secret of secrets) assert.ok(!text.includes(secret), `${origin.id}/${choice.label}@${roll} leaked: ${secret}`);
  }
});

test('the fallback narrator reports what the player perceived: hearsay, travel and a witnessed finale', () => {
  const sim = createWuxiaSimulation('origin-disgraced-disciple');
  const talk = fallbackNarration(resolveAction(sim, interpretPlayerAction('Talk to Old Tea Keeper', sim, 'low'), 60), options);
  assert.ok(talk.includes('Old Tea Keeper tells you what is being said'));
  assert.ok(talk.includes('cannot yet tell how much of it is true'));
  const trip = fallbackNarration(resolveAction(sim, interpretPlayerAction('Travel to Lantern Ferry', sim, 'low'), 60), options);
  assert.ok(/you arrive at Lantern Ferry\./.test(trip) && trip.includes('on the road'), trip);
  const failed = fallbackNarration(resolveAction(sim, interpretPlayerAction('Talk to Old Tea Keeper', sim, 'low'), 5), options);
  assert.ok(!failed.includes('tells you what is being said'));

  let state = createWuxiaSimulation('origin-escort-apprentice'); let finaleText = '';
  for (let t = 1; t <= 40 && !finaleText; t++) {
    const ma = state.jianghu!.npcs.find(n => n.id === 'npc-ma-tie')!;
    const awake = !isAsleep(ma, timeOf(state.world).phase);
    const r = resolveAction(state, interpretPlayerAction(awake && (state.world.turn <= 9 || state.world.turn >= 15) ? 'Talk to Captain Ma Tie' : 'Rest', state, 'low'), 60);
    state = r.state;
    if (r.events.some(e => e.type === 'world.finale_resolved')) finaleText = fallbackNarration(r, options);
  }
  assert.ok(finaleText.includes('capped toll'));
});

test('the fallback never mutates the resolution it describes', () => {
  const sim = createWuxiaSimulation('origin-disgraced-disciple');
  const result = resolveAction(sim, interpretPlayerAction('Talk to Old Tea Keeper', sim, 'low'), 60);
  const before = JSON.stringify(result);
  fallbackNarration(result, options); generateChoices(result.state, ctx);
  assert.equal(JSON.stringify(result), before);
});
