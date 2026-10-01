import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameState } from '../../src/types/game';
import type { ProposedAction, SimulationState } from '../../src/engine/types';
import { enterSimulationBoundary, exitSimulationBoundary } from '../../src/engine/simulationBoundary';
import { resolveAction } from '../../src/engine/resolveAction';
import { resolvePlayerAction } from '../../src/engine/actionPipeline';

function makeSimulation(): SimulationState {
  return {
    schemaVersion: 1,
    character: {
      id: 'hero-1',
      name: 'Test Hero',
      hp: 80,
      maxHp: 100,
      qi: 40,
      maxQi: 100,
      fatigue: 20,
      attributes: {
        strength: 10,
        agility: 0,
        constitution: 10,
        perception: 0,
        intelligence: 10,
        charisma: 10,
        luck: 0,
      },
      conditions: [],
      inventory: [],
      locationId: 'village',
    },
    world: {
      turn: 3,
      locationIds: ['village', 'mountain'],
      knownFacts: [],
      knownRumorIds: [],
      knownNpcIds: [],
    },
  };
}

function makeAction(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    kind: 'inspect',
    description: 'Inspect the surroundings.',
    risk: 'medium',
    ...overrides,
  };
}

function makeGameState(): GameState {
  return {
    character: {
      id: 'hero-1',
      name: 'Test Hero',
      class: 'Wanderer',
      race: 'Human',
      level: 1,
      experience: 0,
      stats: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        charisma: 10,
        luck: 0,
        maxHp: 100,
        currentHp: 80,
        maxMana: 100,
        currentMana: 40,
      },
      skills: [],
      inventory: [],
      gold: 0,
      background: 'Test',
    },
    turns: [],
    currentScene: 'A village road.',
    location: 'village',
    questLog: [],
    relationships: [],
    isGameStarted: true,
    isGameOver: false,
    turnCount: 3,
  };
}

test('successful resolution is deterministic for identical state, action, and roll', () => {
  const input = makeSimulation();
  const action = makeAction();
  const first = resolveAction(input, action, 50);
  const second = resolveAction(input, action, 50);

  assert.deepStrictEqual(first, second);
  assert.equal(first.status, 'success');
});

test('partial and failure outcomes are reproducible at their threshold bands', () => {
  const input = makeSimulation();
  const action = makeAction();

  assert.equal(resolveAction(input, action, 25).status, 'partial');
  assert.equal(resolveAction(input, action, 0).status, 'failure');
});

test('blocked travel does not change location or advance the turn', () => {
  const input = makeSimulation();
  const result = resolveAction(
    input,
    makeAction({ kind: 'travel', description: 'Travel somewhere unknown.', destinationId: 'unknown-place' }),
    99,
  );

  assert.equal(result.status, 'blocked');
  assert.equal(result.state.character.locationId, 'village');
  assert.equal(result.state.world.turn, 3);
});

test('explicit Qi cost blocks an action when Qi is insufficient', () => {
  const input = makeSimulation();
  const result = resolveAction(input, makeAction({ qiCost: 41 }), 99);

  assert.equal(result.status, 'blocked');
  assert.equal(result.state.character.qi, 40);
  assert.equal(result.state.world.turn, 3);
});

test('invalid rolls are rejected', () => {
  assert.throws(() => resolveAction(makeSimulation(), makeAction(), -1), RangeError);
  assert.throws(() => resolveAction(makeSimulation(), makeAction(), 100), RangeError);
  assert.throws(() => resolveAction(makeSimulation(), makeAction(), 1.5), RangeError);
});

test('invalid simulation state is rejected before resolution', () => {
  const invalid = makeSimulation();
  invalid.character.hp = invalid.character.maxHp + 1;

  assert.throws(
    () => resolveAction(invalid, makeAction(), 50),
    /Invalid simulation state/,
  );
});

test('resolver does not mutate its input state', () => {
  const input = makeSimulation();
  const before = structuredClone(input);

  resolveAction(input, makeAction({ kind: 'rest', description: 'Rest by the fire.' }), 99);

  assert.deepStrictEqual(input, before);
});

test('canonical boundary enters with an isolated simulation state and exits through validation', () => {
  const gameState = makeGameState();
  const simulation = enterSimulationBoundary(gameState);

  simulation.character.hp = 60;
  simulation.world.turn = 4;

  assert.equal(gameState.character?.stats.currentHp, 80);
  assert.equal(gameState.turnCount, 3);

  const nextGameState = exitSimulationBoundary(gameState, simulation);

  assert.equal(nextGameState.character?.stats.currentHp, 60);
  assert.equal(nextGameState.turnCount, 4);
  assert.equal(nextGameState.simulation?.character.hp, 60);
});

test('canonical boundary rejects invalid simulation state on commit', () => {
  const gameState = makeGameState();
  const simulation = enterSimulationBoundary(gameState);
  simulation.character.hp = -1;

  assert.throws(
    () => exitSimulationBoundary(gameState, simulation),
    /Cannot commit simulation state/,
  );
});

test('player action pipeline crosses the canonical boundary and returns compatibility state', () => {
  const gameState = makeGameState();
  const result = resolvePlayerAction(gameState, 'Rest by the fire.', 'medium', 99);

  assert.equal(result.resolution.status, 'success');
  assert.equal(result.nextGameState.turnCount, 3);
  assert.equal(result.nextGameState.character?.stats.currentHp, 81);
  assert.ok(result.nextGameState.simulation);
  assert.equal(result.nextGameState.simulation?.character.hp, 81);
});
