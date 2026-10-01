import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretPlayerAction } from '../../src/engine/actionInterpreter';
import { discloseRumorToPlayer } from '../../src/engine/npcDisclosure';
import { buildNarratorDigest } from '../../src/engine/narratorDigest';
import { resolveAction } from '../../src/engine/resolveAction';
import { validateState } from '../../src/engine/validateState';
import { NPC_PROFILES, ORIGINS, buildDigestOptions, createWuxiaSimulation } from '../../src/world/content';

const options = buildDigestOptions();
const start = () => createWuxiaSimulation('origin-disgraced-disciple');
const play = (sim: ReturnType<typeof start>, text: string, roll: number) =>
  resolveAction(sim, interpretPlayerAction(text, sim, 'medium'), roll);

const PUBLIC_TEXT = Object.values(options.locationNotes).join(' ').toLowerCase();
// Fears are short generic words ("bandits", "winter") that can legitimately be public location hazards,
// so only fears that are not public location text count as leaks. Secrets and goals always count.
const SECRETS = NPC_PROFILES.flatMap(p => [
  ...p.npc.secrets,
  ...p.npc.goals.map(g => g.description),
  ...p.npc.fears.filter(f => !PUBLIC_TEXT.includes(f.toLowerCase())),
]);

test('a successful conversation transfers exactly one rumor to the player, with provenance', () => {
  const result = play(start(), 'Talk to Old Tea Keeper', 60);
  assert.equal(result.status, 'success');
  assert.ok(result.state.world.knownRumorIds?.includes('rumor-toll-hike'));
  const rumor = result.state.jianghu!.rumors.find(r => r.id === 'rumor-toll-hike')!;
  assert.ok(rumor.knownBy.includes('player'));
  const told = result.events.filter(e => e.type === 'world.fact_discovered' && e.payload.via === 'npc-teahouse-keeper');
  assert.equal(told.length, 1);
  assert.ok(told[0].witnesses?.includes('player'));
  assert.equal(result.state.jianghu!.knowledgeRecords!.filter(k => k.sourceId === 'rumor-toll-hike').length, 1);
  assert.deepStrictEqual(validateState(result.state), []);
});

test('a failed conversation teaches nothing', () => {
  const result = play(start(), 'Talk to Old Tea Keeper', 5);
  assert.equal(result.status, 'failure');
  assert.ok(!result.state.world.knownRumorIds?.includes('rumor-toll-hike'));
  assert.ok(!buildNarratorDigest(result, options).includes('hearsay'));
  assert.ok(buildNarratorDigest(result, options).includes('FAILURE'));
});

test('talking again yields nothing new rather than inventing content', () => {
  const first = play(start(), 'Talk to Old Tea Keeper', 60);
  const second = play(first.state, 'Talk to Old Tea Keeper', 60);
  assert.equal(second.events.filter(e => e.type === 'world.fact_discovered' && e.payload.via).length, 0);
  assert.ok(buildNarratorDigest(second, options).includes('nothing new to tell you'));
});

test('the digest names the rumor as unverified hearsay and carries the speaker\'s voice', () => {
  const digest = buildNarratorDigest(play(start(), 'Talk to Old Tea Keeper', 60), options);
  assert.ok(digest.includes('Old Tea Keeper told you this, as hearsay'));
  assert.ok(digest.includes('Black River will double the Lantern Ferry toll'));
  assert.ok(digest.includes('How Old Tea Keeper speaks:'));
  assert.ok(digest.includes('Narrate only the facts above'));
});

test('the digest never leaks secrets, goals, fears or offscreen NPCs (all origins, all opening choices, several rolls)', () => {
  assert.ok(SECRETS.length > 20);
  for (const origin of ORIGINS) {
    for (const choice of origin.openingChoices) {
      for (const roll of [5, 50, 95]) {
        const sim = createWuxiaSimulation(origin.id);
        const result = resolveAction(sim, interpretPlayerAction(choice.intent, sim, choice.risk), roll);
        const fullDigest = buildNarratorDigest(result, options);
        // The first line echoes the player's own typed intent, which may name anyone; that is not a leak.
        const digest = fullDigest.split('\n').slice(1).join('\n');
        for (const secret of SECRETS) {
          assert.ok(!digest.includes(secret), `${origin.id}/${choice.label}@${roll} leaked: ${secret}`);
        }
        const here = result.state.character.locationId;
        for (const p of NPC_PROFILES) {
          if (p.npc.locationId === here) continue;
          // An NPC elsewhere may only be named if the player was told about them in this turn's events.
          const told = result.events.some(e => e.type === 'world.fact_discovered' && String(e.payload.fact).includes(p.npc.name));
          if (!told) assert.ok(!digest.includes(p.npc.name), `${origin.id}/${choice.label}@${roll} named offscreen ${p.npc.name}`);
        }
        assert.ok(!digest.includes('npc_action') && !digest.includes('goal-'));
      }
    }
  }
});

test('travel is described and the destination\'s public situation is visible', () => {
  const result = play(start(), 'Travel to Lantern Ferry', 60);
  const digest = buildNarratorDigest(result, options);
  assert.ok(digest.includes('You travelled from The Crossroads to Lantern Ferry.'));
  assert.ok(digest.includes('The Ferry Toll Dispute'));
  assert.ok(digest.includes('Captain Ma Tie (ferry captain, Black River Brotherhood)'));
});

test('digest and disclosure are deterministic and the disclosure helper does not mutate its input', () => {
  const a = buildNarratorDigest(play(start(), 'Talk to Old Tea Keeper', 60), options);
  const b = buildNarratorDigest(play(start(), 'Talk to Old Tea Keeper', 60), options);
  assert.equal(a, b);
  const sim = start();
  const before = JSON.stringify(sim.jianghu);
  discloseRumorToPlayer(sim.jianghu!, sim, 'npc-teahouse-keeper');
  assert.equal(JSON.stringify(sim.jianghu), before);
  assert.deepStrictEqual(discloseRumorToPlayer(sim.jianghu!, sim, 'npc-gu-wen').events, []);
});
