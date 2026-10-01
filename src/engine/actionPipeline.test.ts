import { resolvePlayerAction } from './actionPipeline';
import type { GameState } from '../types/game';

function equal<T>(actual: T, expected: T, message = 'values should match'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

const legacyState: GameState = {
  character: {
    id: 'hero-1',
    name: 'Lin',
    class: 'Wanderer',
    race: 'Human',
    level: 1,
    experience: 0,
    stats: {
      strength: 10,
      agility: 12,
      intelligence: 10,
      charisma: 10,
      luck: 5,
      maxHp: 100,
      currentHp: 80,
      maxMana: 50,
      currentMana: 30,
    },
    skills: [],
    inventory: [],
    gold: 100,
    background: 'A wandering martial artist.',
  },
  turns: [],
  currentScene: 'A mountain road.',
  location: 'mountain-road',
  questLog: [],
  relationships: [],
  isGameStarted: true,
  isGameOver: false,
  turnCount: 0,
};

{
  const result = resolvePlayerAction(
    legacyState,
    'Rest and steady my breathing.',
    'low',
    50,
  );

  equal(result.resolution.status, 'success');
  equal(result.nextGameState.simulation?.schemaVersion, 1);
  equal(result.nextGameState.character?.stats.currentHp, 85);
  equal(result.nextGameState.character?.stats.currentMana, 30);
  equal(result.nextGameState.simulation?.character.fatigue, 0);
}

{
  const result = resolvePlayerAction(
    legacyState,
    'Travel to the moon.',
    'medium',
    99,
  );

  equal(result.resolution.status, 'blocked');
  equal(result.nextGameState.location, 'mountain-road');
}

console.log('Simulation action pipeline tests passed.');
