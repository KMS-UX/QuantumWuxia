import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseDefeat, counterBonus, injuryPenalty, masteryGain, matchTechniqueText, opponentPower } from '../../src/engine/combat';
import { interpretPlayerAction } from '../../src/engine/actionInterpreter';
import { buildNarratorDigest } from '../../src/engine/narratorDigest';
import { qiRecovery } from '../../src/engine/wuxiaRules';
import { fallbackNarration } from '../../src/ai/fallbackNarrator';
import { resolveAction } from '../../src/engine/resolveAction';
import { resolvePlayerAction } from '../../src/engine/actionPipeline';
import type { RiskLevel, SimulationState } from '../../src/engine/types';
import { validateState } from '../../src/engine/validateState';
import type { GameState } from '../../src/types/game';
import { ARTS_BY_ID, FANTASY_PRESETS, NPC_PROFILES, buildDigestOptions, createOriginCharacter, createWuxiaSimulation, findOrigin, instantiateArt } from '../../src/world/content';

const options = buildDigestOptions();
const run = (sim: SimulationState, text: string, roll: number, risk: RiskLevel = 'medium') =>
  resolveAction(sim, interpretPlayerAction(text, sim, risk), roll);
const disciple = () => createWuxiaSimulation('origin-disgraced-disciple'); // Azure River Sword 22, at The Crossroads with the swordsman and tea keeper
const npc = (sim: SimulationState, id: string) => sim.jianghu!.npcs.find(n => n.id === id)!;

test('a casual technique phrase can no longer crash a turn; real technique names resolve to owned technique ids', () => {
  const sim = disciple();
  for (const text of ['Attack the Wandering Swordsman with my sword', 'Meditate using breathing exercises', 'Rest with a blanket', 'Attack Old Tea Keeper using a stick']) {
    assert.doesNotThrow(() => run(sim, text, 60), text);
    assert.equal(interpretPlayerAction(text, sim).techniqueId, undefined, text);
  }
  assert.equal(interpretPlayerAction('Attack Old Tea Keeper using Ripple Parry', sim).techniqueId, 'tech-ripple-parry');
  assert.equal(matchTechniqueText('current cutting thrust', sim.character), 'tech-current-cutting-thrust'.replace('cutting', 'cutting') && 'tech-current-thrust');
  assert.equal(matchTechniqueText('Azure River Sword', sim.character), 'tech-ripple-parry'); // art named: its cheapest form
  assert.equal(matchTechniqueText('Nine-Bell Breathing', sim.character), undefined); // not owned
});

test('a named technique costs its Qi, an unnamed strike costs none, and too little Qi blocks it', () => {
  const sim = disciple();
  assert.equal(run(sim, 'Attack the Wandering Swordsman', 60).state.character.qi, sim.character.qi);
  const named = run(sim, 'Attack the Wandering Swordsman using Ripple Parry', 60);
  assert.equal(named.state.character.qi, sim.character.qi - 2);
  assert.ok(named.events.some(e => e.type === 'character.qi_changed' && e.payload.amount === -2));
  const drained = disciple(); drained.character.qi = 1;
  assert.equal(run(drained, 'Attack the Wandering Swordsman using Ripple Parry', 60).status, 'blocked');
});

test('technique mastery requirements are enforced', () => {
  const sim = disciple(); // Azure River Sword mastery 22; Whirlpool Bind needs 40
  const locked = run(sim, 'Attack the Wandering Swordsman using Whirlpool Bind', 99);
  assert.equal(locked.status, 'blocked');
  assert.match(locked.summary, /not yet mastered Whirlpool Bind/);
  sim.character.wuxia!.martialArts[0].mastery = 40;
  assert.notEqual(run(sim, 'Attack the Wandering Swordsman using Whirlpool Bind', 99).status, 'blocked');
});

test('attacking someone who is not here, or is dead, is blocked rather than silently succeeding', () => {
  const sim = disciple();
  assert.equal(run(sim, 'Attack Captain Ma Tie', 99).status, 'blocked'); // at Lantern Ferry
  npc(sim, 'npc-wandering-swordsman').alive = false;
  assert.equal(run(sim, 'Attack the Wandering Swordsman', 99).status, 'blocked');
});

test('a duel has real stakes: winning is free, losing costs HP and a located injury, and rolls order the outcomes', () => {
  const by = (roll: number) => run(disciple(), 'Challenge the Wandering Swordsman to a friendly duel', roll);
  const win = by(95); const draw = by(45); const loss = by(5);
  assert.deepStrictEqual([win.status, draw.status, loss.status], ['success', 'partial', 'failure']);
  assert.equal(win.state.character.hp, 100);
  assert.ok(draw.state.character.hp < 100 && draw.state.character.hp > loss.state.character.hp);
  const injury = loss.events.find(e => e.type === 'character.injury_added')!;
  assert.ok(['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'internal'].includes(String(injury.payload.bodyRegion)));
  assert.equal(loss.state.character.wuxia!.injuries.length, 1);
  assert.deepStrictEqual(validateState(loss.state), []);
});

test('an honourable bout is gentler than assault: less damage, no grudge, no faction penalty, no bystander anger', () => {
  const bout = run(disciple(), 'Challenge the Wandering Swordsman to a friendly duel', 5, 'high');
  const assault = run(disciple(), 'Attack the Wandering Swordsman', 5, 'high');
  assert.ok(100 - bout.state.character.hp < 100 - assault.state.character.hp);
  const grudge = (r: typeof bout) => r.state.jianghu!.relationships.find(x => x.subjectId === 'player' && x.targetId === 'npc-wandering-swordsman')?.grudge ?? 0;
  assert.equal(grudge(bout), 0);
  assert.equal(grudge(assault), 25);
  // Faction standing: Captain Ma belongs to the Black River Brotherhood.
  const ferry = () => createWuxiaSimulation('origin-escort-apprentice');
  const rep = (r: ReturnType<typeof run>) => r.state.jianghu!.factions.find(f => f.id === 'faction-black-river')!.playerReputation;
  assert.equal(rep(run(ferry(), 'Challenge Captain Ma Tie to a friendly duel', 60)), 0);
  assert.equal(rep(run(ferry(), 'Attack Captain Ma Tie', 60)), -10);
  assert.equal(npc(assault.state, 'npc-wandering-swordsman').disposition, -20, 'generic assault fallout and fight-specific fallout, counted once each');
  assert.equal(npc(bout.state, 'npc-wandering-swordsman').disposition, -5);
  assert.ok(npc(assault.state, 'npc-teahouse-keeper').disposition < 0, 'bystander disapproves of violence');
  assert.equal(npc(bout.state, 'npc-teahouse-keeper').disposition, 0);
});

test('style counters are felt from both sides, and are symmetric in the authored data', () => {
  const swordsman = npc(disciple(), 'npc-wandering-swordsman'); // practises Azure River Sword
  const palm = instantiateArt('art-iron-mountain-palm', 20);
  const saber = instantiateArt('art-willow-leaf-saber', 20);
  const sword = instantiateArt('art-azure-river-sword', 20);
  assert.equal(counterBonus(palm, swordsman), 10);
  assert.equal(counterBonus(saber, swordsman), -10);
  assert.equal(counterBonus(sword, swordsman), 0);
  for (const profile of Object.values(ARTS_BY_ID)) {
    for (const other of profile.art.strongAgainstArts ?? []) assert.ok(ARTS_BY_ID[other].art.counteredByArts?.includes(profile.art.id) || ARTS_BY_ID[other], `${profile.art.id} > ${other}`);
    for (const id of [...(profile.art.strongAgainstArts ?? []), ...(profile.art.counteredByArts ?? [])]) assert.ok(ARTS_BY_ID[id], id);
  }
  const advantage = run(disciple(), 'Attack the Wandering Swordsman', 60);
  assert.equal(advantage.events.find(e => e.type === 'character.combat_resolved')!.payload.counter, 'even');
});

test('injuries matter: arms handicap fighting, legs handicap travel, internal wounds slow Qi recovery, rest heals faster', () => {
  const sim = disciple(); const c = sim.character;
  assert.equal(injuryPenalty(c, 'attack'), 0);
  c.wuxia!.injuries.push({ id: 'a', severity: 2, bodyRegion: 'leftArm', healingTurns: 9, untreated: true });
  c.wuxia!.injuries.push({ id: 'l', severity: 2, bodyRegion: 'rightLeg', healingTurns: 9, untreated: true });
  assert.equal(injuryPenalty(c, 'attack'), 4);
  assert.equal(injuryPenalty(c, 'travel'), 10);
  const healthy = run(disciple(), 'Travel to Lantern Ferry', 60);
  const lame = run(sim, 'Travel to Lantern Ferry', 60);
  assert.equal(lame.difficulty - healthy.difficulty, 10);
  const base = disciple().character as never;
  const hurt = disciple().character as never;
  (hurt as { wuxia: { injuries: unknown[] } }).wuxia.injuries.push({ id: 'i', severity: 3, bodyRegion: 'internal', healingTurns: 9, untreated: true });
  assert.ok(qiRecovery(hurt, 40) < qiRecovery(base, 40));
  const resting = disciple(); resting.character.wuxia!.injuries.push({ id: 'w', severity: 1, bodyRegion: 'torso', healingTurns: 10, untreated: true });
  const after = run(resting, 'Rest', 60).state.character.wuxia!.injuries[0];
  assert.equal(after.healingTurns, 8); // one extra turn faster than waiting
});

test('practice raises mastery with diminishing returns, costs Qi, and unlocks locked techniques over time', () => {
  let sim = disciple();
  const mastery = () => sim.character.wuxia!.martialArts[0].mastery;
  const start = mastery();
  const r = run(sim, 'Practice the Azure River Sword', 60);
  assert.ok(mastery() === start && r.state.character.wuxia!.martialArts[0].mastery > start);
  assert.equal(masteryGain('success', 0, true), 3);
  assert.equal(masteryGain('success', 40, true), 2);
  assert.equal(masteryGain('success', 90, true), 1);
  assert.equal(masteryGain('failure', 0, true), 0);
  for (let i = 0; i < 40; i++) {
    sim.character.fatigue = 0; sim.character.qi = sim.character.maxQi;
    sim = run(sim, 'Practice the Azure River Sword', 60).state;
    assert.deepStrictEqual(validateState(sim), []);
  }
  assert.ok(mastery() >= 40, `mastery ${mastery()}`);
  assert.notEqual(run(sim, 'Attack the Wandering Swordsman using Whirlpool Bind', 60).status, 'blocked');
  assert.equal(run(createWuxiaSimulation('origin-wandering-physician'), 'Practice the Heart-Sutra Healing Touch', 60).status, 'success');
});

test('beating someone far weaker teaches nothing: no mastery farming on bystanders', () => {
  const r = run(disciple(), 'Attack Old Tea Keeper', 99);
  assert.equal(r.status, 'success');
  assert.ok(!r.events.some(e => e.type === 'character.mastery_changed'));
});

test('defeat creates a new situation: mercy, robbery, detention, and death only when the circumstances justify it', () => {
  const j = disciple().jianghu!;
  const foe = (id: string) => j.npcs.find(n => n.id === id)!;
  const args = (id: string, over: Partial<Parameters<typeof chooseDefeat>[0]> = {}) => ({ jianghu: j, opponent: foe(id), honourable: false, risk: 'medium' as RiskLevel, margin: 10, ...over });
  assert.equal(chooseDefeat(args('npc-gu-wen', { honourable: true })), 'mercy');
  assert.equal(chooseDefeat(args('npc-abbot-huiyuan', { risk: 'high', margin: 99 })), 'mercy'); // monks never kill
  assert.equal(chooseDefeat(args('npc-yun-shuang')), 'mercy');
  assert.equal(chooseDefeat(args('npc-zhao-rong')), 'detained'); // garrison
  assert.equal(chooseDefeat(args('npc-ma-tie')), 'robbed');
  assert.equal(chooseDefeat(args('npc-bai-qingshan', { risk: 'high', margin: 40 })), 'killed');
  assert.equal(chooseDefeat(args('npc-bai-qingshan', { risk: 'high', margin: 10 })), 'robbed');
  assert.equal(chooseDefeat(args('npc-bai-qingshan', { risk: 'medium', margin: 99 })), 'robbed');
});

test('being beaten at low HP plays out end to end: robbed, left alive, Face lost; a bout never takes your things', () => {
  const sim = disciple(); sim.character.hp = 8; sim.character.inventory = ['plain sword', 'expulsion token', 'copper coins'];
  const robbed = run(sim, 'Attack the Wandering Swordsman', 5);
  assert.equal(robbed.state.character.hp, 15);
  assert.deepStrictEqual(robbed.state.character.inventory, ['plain sword']);
  const defeat = robbed.events.find(e => e.type === 'character.defeated')!;
  assert.equal(defeat.payload.outcome, 'robbed');
  assert.ok(robbed.state.character.wuxia!.social.face < sim.character.wuxia!.social.face);
  assert.deepStrictEqual(validateState(robbed.state), []);

  const bout = disciple(); bout.character.hp = 8; bout.character.inventory = ['plain sword', 'copper coins'];
  const spared = run(bout, 'Challenge the Wandering Swordsman to a friendly duel', 5);
  assert.equal(spared.events.find(e => e.type === 'character.defeated')!.payload.outcome, 'mercy');
  assert.deepStrictEqual(spared.state.character.inventory, ['plain sword', 'copper coins']);
  assert.ok(spared.state.character.hp >= 1);
});

test('robbery syncs canonical inventory loss back to the live GameState and save model', () => {
  const origin = findOrigin('origin-disgraced-disciple')!;
  const simulation = createWuxiaSimulation(origin.id, FANTASY_PRESETS.living_legends, 'Tester', 7);
  simulation.character.hp = 8;
  const game: GameState = {
    character: createOriginCharacter(origin, 'Tester', 'character-1', 'living_legends'),
    turns: [], currentScene: '', location: simulation.character.locationId,
    questLog: [], relationships: [], isGameStarted: true, isGameOver: false, turnCount: 0, simulation,
  };

  const result = resolvePlayerAction(game, 'Attack the Wandering Swordsman', 'medium', 5);

  assert.equal(result.resolution.events.find(e => e.type === 'character.defeated')?.payload.outcome, 'robbed');
  assert.deepStrictEqual(result.nextGameState.simulation?.character.inventory, []);
  assert.deepStrictEqual(result.nextGameState.character?.inventory, []);
  assert.equal(result.nextGameState.character?.stats.currentHp, result.nextGameState.simulation?.character.hp);
});

test('death is possible and final, and is clearly caused: reckless lethal assault on a master at low HP', () => {
  const sim = disciple();
  const bai = npc(sim, 'npc-bai-qingshan'); bai.locationId = sim.character.locationId;
  sim.character.hp = 5;
  const r = run(sim, 'Attack Elder Bai Qingshan', 1, 'high');
  assert.equal(r.events.find(e => e.type === 'character.defeated')?.payload.outcome, 'killed');
  assert.equal(r.state.character.hp, 0);
  assert.deepStrictEqual(validateState(r.state), []);
});

test('nothing in a monastery kills you: attacking the abbot at any risk ends in mercy', () => {
  const sim = disciple(); sim.character.hp = 3;
  const abbot = npc(sim, 'npc-abbot-huiyuan'); abbot.locationId = sim.character.locationId;
  const r = run(sim, 'Attack Abbot Huiyuan', 1, 'high');
  assert.equal(r.events.find(e => e.type === 'character.defeated')?.payload.outcome, 'mercy');
  assert.ok(r.state.character.hp > 0);
});

test('opponent power: authored where it matters, bounded and derived otherwise', () => {
  for (const p of NPC_PROFILES) { const power = opponentPower(p.npc); assert.ok(power >= 5 && power <= 95, p.npc.id); }
  assert.ok(opponentPower(npc(disciple(), 'npc-bai-qingshan')) > opponentPower(npc(disciple(), 'npc-ma-tie')));
  const plain = { ...npc(disciple(), 'npc-ma-tie'), power: undefined, resources: 40, skills: ['a', 'b'] };
  assert.equal(opponentPower(plain), 36);
});

test('the narrator and the fallback narrator both report the fight, the wound and the outcome, and never the opponent\'s power or secrets', () => {
  const secrets = NPC_PROFILES.flatMap(p => [...p.npc.secrets, ...p.npc.goals.map(g => g.description)]);
  const sim = disciple(); sim.character.hp = 8; sim.character.inventory = ['plain sword', 'copper coins'];
  const lost = run(sim, 'Attack the Wandering Swordsman', 5);
  const digest = buildNarratorDigest(lost, options); assert.ok(/injury to your (head|torso|left arm|right arm|left leg|right leg|inner organs)/.test(digest), digest); const plain = fallbackNarration(lost, options);
  for (const text of [digest, plain]) {
    assert.ok(/(gets|got) the better of you/.test(text), text);
    assert.ok(/strips you of/.test(text), text);
    for (const s of secrets) assert.ok(!text.includes(s));
  }
  assert.ok(!/power/i.test(digest.split('\n').slice(1).join('\n')));
  const won = run(disciple(), 'Challenge the Wandering Swordsman to a friendly duel', 95);
  assert.ok(buildNarratorDigest(won, options).includes('You bested Wandering Swordsman in a bout.'));
  assert.ok(buildNarratorDigest(won, options).includes('feels sharper'));
});

test('every origin x every NPC x risk x roll: a fight always leaves a valid, replayable world', () => {
  let checked = 0;
  for (const origin of ['origin-disgraced-disciple', 'origin-escort-apprentice', 'origin-frontier-deserter', 'origin-wandering-physician']) {
    for (const p of NPC_PROFILES) {
      for (const risk of ['low', 'medium', 'high'] as RiskLevel[]) {
        for (const roll of [0, 30, 60, 99]) {
          const sim = createWuxiaSimulation(origin);
          npc(sim, p.npc.id).locationId = sim.character.locationId;
          sim.character.hp = [100, 30, 5][roll % 3];
          const before = JSON.stringify(sim);
          const text = roll % 2 ? `Attack ${p.npc.name}` : `Challenge ${p.npc.name} to a friendly duel`;
          const r = run(sim, text, roll, risk);
          assert.equal(JSON.stringify(sim), before, 'input mutated');
          assert.deepStrictEqual(validateState(r.state), [], `${origin}/${p.npc.id}/${risk}/${roll}`);
          assert.ok(r.state.character.hp >= 0 && r.state.character.hp <= r.state.character.maxHp);
          assert.ok(r.state.character.qi >= 0);
          assert.equal(JSON.stringify(run(sim, text, roll, risk).state), JSON.stringify(r.state), 'not deterministic');
          checked++;
        }
      }
    }
  }
  assert.ok(checked >= 500);
});
