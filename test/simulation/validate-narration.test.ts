import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHOICE_COUNT, MAX_CHOICE_CHARS, MAX_NARRATIVE_CHARS, NARRATIVE_FALLBACK, balancedObjects, parseNarration,
} from '../../src/ai/validateNarration';

const good = {
  narrative: 'Rain taps the tea house roof.',
  choices: [
    { id: 1, text: 'Talk to the tea keeper', risk: 'low' }, { id: 2, text: 'Read the notice wall', risk: 'low' },
    { id: 3, text: 'Travel to Lantern Ferry', risk: 'medium' }, { id: 4, text: 'Rest', risk: 'low' },
    { id: 5, text: 'Watch the road', risk: 'high' },
  ],
  stateUpdates: {},
};

test('clean output passes untouched with no issues', () => {
  const v = parseNarration(JSON.stringify(good));
  assert.deepStrictEqual(v.issues, []);
  assert.equal(v.result.narrative, good.narrative);
  assert.deepStrictEqual(v.result.choices, good.choices);
});

test('JSON wrapped in prose or code fences is extracted; braces inside strings do not confuse it', () => {
  const tricky = { ...good, narrative: 'He said "run {now}" and drew a } blade.' };
  for (const raw of ['Here you go:\n```json\n' + JSON.stringify(tricky) + '\n```\nEnjoy!', 'noise {not json} then ' + JSON.stringify(tricky)]) {
    const v = parseNarration(raw);
    assert.equal(v.result.narrative, tricky.narrative);
    assert.equal(v.narrativeIsFallback, false);
  }
  assert.deepStrictEqual(balancedObjects('a {"x":"}"} b {"y":1}'), ['{"x":"}"}', '{"y":1}']);
});

test('the old greedy regex failure case (two objects) now picks the narration object', () => {
  const v = parseNarration('{"note":"ignore"}\n' + JSON.stringify(good) + '\n{"trailing":true}');
  assert.equal(v.result.narrative, good.narrative);
});

test('state updates are stripped; only a known locationChange survives', () => {
  const raw = JSON.stringify({ ...good, stateUpdates: { hpChange: 999, goldChange: 1e6, itemsGained: ['Sword of Ten Thousand Truths'], skillsGained: ['everything'], locationChange: 'Lantern Ferry' } });
  const open = parseNarration(raw);
  assert.deepStrictEqual(open.result.stateUpdates, { locationChange: 'Lantern Ferry' });
  assert.ok(open.issues.some(i => i.includes('state updates ignored') && i.includes('hpChange')));
  const strict = parseNarration(raw, { allowedLocationIds: ['The Crossroads'] });
  assert.deepStrictEqual(strict.result.stateUpdates, {});
  assert.ok(strict.issues.some(i => i.includes('not a known location')));
  assert.deepStrictEqual(parseNarration(JSON.stringify({ ...good, stateUpdates: { locationChange: 42 } })).result.stateUpdates, {});
});

test('choices are normalised: renumbered, risk repaired, deduped, trimmed, capped and padded to five', () => {
  const messy = { narrative: 'x', choices: [
    { id: 9, text: '  Talk   to\nthe keeper ', risk: 'LOW' }, { id: 9, text: 'talk to the keeper', risk: 'low' },
    'Plain string choice', { text: 'Bad risk', risk: 'extreme' }, { text: '' }, { risk: 'low' }, null, 7,
    { text: 'a'.repeat(500), risk: 'high' }, { text: 'Seventh', risk: 'low' }, { text: 'Eighth', risk: 'low' },
  ] };
  const v = parseNarration(JSON.stringify(messy));
  assert.equal(v.result.choices.length, CHOICE_COUNT);
  assert.deepStrictEqual(v.result.choices.map(c => c.id), [1, 2, 3, 4, 5]);
  assert.equal(v.result.choices[0].text, 'Talk to the keeper');
  assert.equal(v.result.choices[0].risk, 'low');
  assert.equal(v.result.choices[2].risk, 'medium');
  assert.ok(v.result.choices.every(c => c.text.length <= MAX_CHOICE_CHARS && ['low', 'medium', 'high'].includes(c.risk)));
  assert.equal(new Set(v.result.choices.map(c => c.text.toLowerCase())).size, CHOICE_COUNT);
});

test('missing, empty or malformed choices are padded with distinct stock choices', () => {
  for (const choices of [undefined, [], 'nope', { a: 1 }, [{ text: 'Only one' }]]) {
    const v = parseNarration(JSON.stringify({ narrative: 'x', choices }));
    assert.equal(v.result.choices.length, CHOICE_COUNT);
    assert.equal(new Set(v.result.choices.map(c => c.text.toLowerCase())).size, CHOICE_COUNT);
  }
});

test('narrative recovery: plain prose, truncated JSON, wrong types, and total garbage', () => {
  const prose = parseNarration('The wind turns cold over the pass.');
  assert.equal(prose.result.narrative, 'The wind turns cold over the pass.');
  assert.equal(prose.narrativeIsFallback, false);

  const truncated = parseNarration('{"narrative": "The bell tolls once, and then he saw it, \\"a shadow\\" on the wall');
  assert.ok(truncated.result.narrative.startsWith('The bell tolls once'));
  assert.equal(truncated.narrativeIsFallback, false);

  for (const raw of ['{"narrative": 42}', '{"narrative": ""}', '{"narrative": null, "choices": []}', '{}', '', '   ', '{"a":']) {
    const v = parseNarration(raw);
    assert.equal(v.narrativeIsFallback, true, raw);
    assert.equal(v.result.narrative, NARRATIVE_FALLBACK);
    assert.equal(v.result.choices.length, CHOICE_COUNT);
  }
});

test('overlong narrative is cut at a sentence boundary', () => {
  const long = 'The river runs on. '.repeat(400);
  const v = parseNarration(JSON.stringify({ narrative: long, choices: [] }));
  assert.ok(v.result.narrative.length <= MAX_NARRATIVE_CHARS);
  assert.ok(v.result.narrative.endsWith('.'));
  assert.ok(v.issues.some(i => i.includes('truncated')));
});

test('the validator is total: random junk never throws and always yields a playable result', () => {
  const junk = ['{', '}', '"', '\\', '{"narrative"', '[]', 'null', '{"narrative":{"a":1}}', '{"narrative":"ok","choices":{"0":"a"}}',
    '```', '{"narrative":"x","stateUpdates":"boom"}', '{"narrative":"x","stateUpdates":[1,2]}', '\u0000\u2028', '{"narrative":"x","choices":[[],{}, {"text":{}}]}'];
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 500; i++) {
    const raw = Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => junk[Math.floor(rnd() * junk.length)]).join(rnd() < 0.5 ? '' : ' ');
    const v = parseNarration(raw);
    assert.ok(v.result.narrative.length > 0 && v.result.narrative.length <= MAX_NARRATIVE_CHARS);
    assert.equal(v.result.choices.length, CHOICE_COUNT);
    assert.deepStrictEqual(Object.keys(v.result.stateUpdates).filter(k => k !== 'locationChange'), []);
  }
});
