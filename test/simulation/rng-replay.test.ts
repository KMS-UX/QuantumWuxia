import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePlayerAction } from '../../src/engine/actionPipeline';
import { peekRoll, rollAt } from '../../src/engine/rng';
import { validateState } from '../../src/engine/validateState';
import type { GameState } from '../../src/types/game';
import { FANTASY_PRESETS, createOriginCharacter, createWuxiaSimulation, findOrigin } from '../../src/world/content';

/** A GameState exactly as the store builds it for an origin character. */
function newGame(originId = 'origin-disgraced-disciple', seed = 7): GameState {
  const origin = findOrigin(originId)!;
  const simulation = createWuxiaSimulation(originId, FANTASY_PRESETS.living_legends, 'Tester', seed);
  return {
    character: createOriginCharacter(origin, 'Tester', 'c1', 'living_legends'), turns: [], currentScene: '',
    location: simulation.character.locationId, questLog: [], relationships: [], isGameStarted: true, isGameOver: false, turnCount: 0, simulation,
  };
}
const SCRIPT = ['Talk to Old Tea Keeper', 'Rest', 'Travel to Lantern Ferry', 'Talk to Captain Ma Tie', 'Meditate quietly', 'Inspect the toll house', 'Travel to The Crossroads', 'Rest'];
function play(game: GameState, turns: number) {
  const rolls: number[] = [];
  for (let i = 0; i < turns; i++) {
    const prepared = resolvePlayerAction(game, SCRIPT[i % SCRIPT.length], 'medium');
    rolls.push(prepared.resolution.roll);
    game = prepared.nextGameState;
    assert.deepStrictEqual(validateState(game.simulation!), [], `turn ${i}`);
  }
  return { game, rolls };
}

test('rollAt is a pure function of (seed, draw) with a usable spread over 0..99', () => {
  assert.equal(rollAt(42, 5), rollAt(42, 5));
  assert.notEqual(rollAt(42, 5) + rollAt(42, 6) + rollAt(42, 7), rollAt(43, 5) + rollAt(43, 6) + rollAt(43, 7));
  const counts = new Array(10).fill(0);
  for (let d = 0; d < 20000; d++) { const r = rollAt(12345, d); assert.ok(Number.isInteger(r) && r >= 0 && r <= 99); counts[Math.floor(r / 10)]++; }
  for (const c of counts) assert.ok(c > 1700 && c < 2300, `decile count ${c}`);
});

test('the same seed and the same actions replay to a byte-identical game, rolls included', () => {
  const a = play(newGame('origin-disgraced-disciple', 99), 40);
  const b = play(newGame('origin-disgraced-disciple', 99), 40);
  assert.deepStrictEqual(a.rolls, b.rolls);
  assert.equal(JSON.stringify(a.game.simulation), JSON.stringify(b.game.simulation));
  const other = play(newGame('origin-disgraced-disciple', 100), 40);
  assert.notDeepStrictEqual(a.rolls, other.rolls);
});

test('each resolved action consumes exactly one draw, and the roll used is the one that was peeked', () => {
  let game = newGame();
  for (let i = 0; i < 6; i++) {
    const expected = peekRoll(game.simulation!);
    assert.equal(game.simulation!.world.rng!.draws, i);
    const prepared = resolvePlayerAction(game, 'Rest', 'low');
    assert.equal(prepared.resolution.roll, expected);
    game = prepared.nextGameState;
  }
  assert.equal(game.simulation!.world.rng!.draws, 6);
});

test('an injected roll is honoured and does not disturb the saved sequence', () => {
  const game = newGame();
  const injected = resolvePlayerAction(game, 'Rest', 'low', 77);
  assert.equal(injected.resolution.roll, 77);
  assert.deepStrictEqual(injected.nextGameState.simulation!.world.rng, game.simulation!.world.rng);
});

test('a save from before seeded rolls gets a seed on its first action and is replayable from then on', () => {
  const legacy = newGame(); delete legacy.simulation!.world.rng;
  const first = resolvePlayerAction(legacy, 'Rest', 'low');
  const rng = first.nextGameState.simulation!.world.rng!;
  assert.equal(rng.draws, 1);
  assert.ok(Number.isInteger(rng.seed));
  const second = resolvePlayerAction(first.nextGameState, 'Rest', 'low');
  assert.equal(second.resolution.roll, rollAt(rng.seed, 1));
});

test('corrupt rng values are rejected at the boundary', () => {
  for (const bad of [{ seed: -1, draws: 0 }, { seed: 1.5, draws: 0 }, { seed: 1, draws: -3 }, { seed: 2 ** 40, draws: 0 }]) {
    const game = newGame(); game.simulation!.world.rng = bad;
    assert.throws(() => resolvePlayerAction(game, 'Rest', 'low'), /rng/);
  }
});

test('the live pipeline (store path) can actually travel between authored locations', () => {
  let game = newGame('origin-disgraced-disciple');
  assert.equal(game.location, 'The Crossroads');
  // Re-roll the seed until the travel roll succeeds so the test is about wiring, not luck.
  for (let seed = 1; seed < 50; seed++) {
    game = newGame('origin-disgraced-disciple', seed);
    const prepared = resolvePlayerAction(game, 'Travel to Lantern Ferry', 'low');
    if (prepared.resolution.status === 'success') { game = prepared.nextGameState; break; }
  }
  assert.equal(game.location, 'Lantern Ferry');
  assert.equal(game.simulation!.character.locationId, 'Lantern Ferry');
});
