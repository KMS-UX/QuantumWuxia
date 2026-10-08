import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ARTS_BY_ID, FACTIONS, LOCATIONS, NPC_PROFILES, ORIGINS, RUMORS, WORLD_EVENTS } from '../../src/world/content';

/**
 * Framework vs content. The engine and the AI boundary are the framework: they know the rules of
 * time, travel, combat, knowledge and consequence, and nothing about any particular story. Anything
 * a particular story contains (its places, people, factions, arts, plots) lives in `src/world/content`
 * as replaceable data, and what happens in a game comes from what the player decides. These tests
 * make that split a build failure instead of a convention.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const sources = (dir: string) => readdirSync(join(root, dir)).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts')).map(f => ({ file: `${dir}/${f}`, text: readFileSync(join(root, dir, f), 'utf8') }));
const framework = [...sources('engine'), ...sources('ai')];
const importsOf = (text: string) => [...text.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/gm)].map(m => m[1]);

test('the framework never imports content, UI, state stores or network services', () => {
  const forbidden = [/world\//, /\/store\//, /\/services\//, /\/components\//, /^react/, /^zustand/, /^lucide/];
  for (const { file, text } of framework) {
    for (const spec of importsOf(text)) {
      for (const bad of forbidden) assert.ok(!bad.test(spec), `${file} imports ${spec}`);
    }
    assert.ok(!/\b(localStorage|sessionStorage|fetch\(|window\.|document\.)/.test(text), `${file} touches the platform`);
  }
});

test('the framework does not randomise on its own: no Math.random or clock reads inside the engine', () => {
  for (const { file, text } of sources('engine')) {
    if (file.endsWith('/rng.ts')) { assert.ok(text.includes('Math.random'), 'the only entropy source is rng.randomSeed'); continue; }
    assert.ok(!/Math\.random|Date\.now|new Date\(/.test(text), file);
  }
});

test('no authored place, person, faction, art or plot id appears in the framework (the legacy default world in jianghu.ts is the one known exception)', () => {
  const ids = new Set<string>([
    ...LOCATIONS.map(l => l.id), ...NPC_PROFILES.map(p => p.npc.id), ...FACTIONS.map(f => f.id), ...Object.keys(ARTS_BY_ID),
    ...ORIGINS.map(o => o.id), ...RUMORS.map(r => r.id), ...WORLD_EVENTS.map(e => e.id),
  ]);
  for (const { file, text } of framework) {
    if (file === 'engine/jianghu.ts') continue; // createDefaultJianghu: a tiny placeholder world for legacy games, to be retired
    for (const id of ids) assert.ok(!text.includes(`'${id}'`) && !text.includes(`"${id}"`), `${file} hard-codes authored id ${id}`);
  }
});

test('content depends only on the engine\'s data types, never on the store, services, components or the AI layer', () => {
  const dir = join(root, 'world', 'content');
  for (const f of readdirSync(dir).filter(n => n.endsWith('.ts'))) {
    for (const spec of importsOf(readFileSync(join(dir, f), 'utf8'))) {
      assert.ok(!/\/store\/|\/services\/|\/components\/|\/ai\/|^react|^zustand/.test(spec), `${f} imports ${spec}`);
    }
  }
});
