import { validClock } from './clock';
import { validateMap } from './worldMap';
import type { SimulationState } from './types';

export type StateValidationIssue = {
  path: string;
  message: string;
};

export function validateState(state: SimulationState): StateValidationIssue[] {
  const issues: StateValidationIssue[] = [];
  const c = state.character;

  if (state.schemaVersion !== 1) {
    issues.push({ path: 'schemaVersion', message: 'Unsupported simulation schema version.' });
  }
  if (!c.id.trim()) issues.push({ path: 'character.id', message: 'Character id must not be empty.' });
  if (!c.name.trim()) issues.push({ path: 'character.name', message: 'Character name must not be empty.' });
  if (!Number.isFinite(c.hp) || !Number.isFinite(c.maxHp) || c.maxHp <= 0 || c.hp < 0 || c.hp > c.maxHp) {
    issues.push({ path: 'character.hp', message: 'HP must be finite and within 0..maxHp.' });
  }
  if (!Number.isFinite(c.qi) || !Number.isFinite(c.maxQi) || c.maxQi < 0 || c.qi < 0 || c.qi > c.maxQi) {
    issues.push({ path: 'character.qi', message: 'Qi must be finite and within 0..maxQi.' });
  }
  if (!Number.isFinite(c.fatigue) || c.fatigue < 0 || c.fatigue > 100) {
    issues.push({ path: 'character.fatigue', message: 'Fatigue must be within 0..100.' });
  }
  const rng = state.world.rng;
  if (rng && !(Number.isInteger(rng.seed) && rng.seed >= 0 && rng.seed <= 0xffffffff && Number.isInteger(rng.draws) && rng.draws >= 0)) {
    issues.push({ path: 'world.rng', message: 'rng must hold an integer 32-bit seed and a non-negative integer draw count.' });
  }
  if (state.world.clock && !validClock(state.world.clock)) {
    issues.push({ path: 'world.clock', message: 'Clock config must have valid season, day and tick values.' });
  }
  if (state.world.map) {
    for (const problem of validateMap(state.world.map, state.world.locationIds)) issues.push({ path: 'world.map', message: problem });
  }
  if (!state.world.locationIds.includes(c.locationId)) {
    issues.push({ path: 'character.locationId', message: 'Current location must exist in world.locationIds.' });
  }
  if (!Array.isArray(state.ledger)) {
    issues.push({ path: 'ledger', message: 'Event ledger must be an array.' });
  } else {
    for (const [index, entry] of state.ledger.entries()) {
      const path = `ledger[${index}]`;
      if (!entry.eventId.trim()) issues.push({ path: `${path}.eventId`, message: 'Event id must not be empty.' });
      if (!Number.isInteger(entry.turn) || entry.turn < 0) issues.push({ path: `${path}.turn`, message: 'Event turn must be a non-negative integer.' });
      if (!entry.actorId.trim()) issues.push({ path: `${path}.actorId`, message: 'Event actor id must not be empty.' });
      if (!entry.actionDescription.trim()) issues.push({ path: `${path}.actionDescription`, message: 'Event action description must not be empty.' });
      if (!entry.locationId.trim()) issues.push({ path: `${path}.locationId`, message: 'Event location id must not be empty.' });
      if (entry.provenance !== 'deterministic-resolver') issues.push({ path: `${path}.provenance`, message: 'Event provenance must be deterministic-resolver.' });
      for (const [field, values] of Object.entries({
        targetIds: entry.targetIds, causes: entry.causes, effects: entry.effects,
        witnesses: entry.witnesses, knowledgeConsequences: entry.knowledgeConsequences, causalLinks: entry.causalLinks,
      })) {
        if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) {
          issues.push({ path: `${path}.${field}`, message: 'Event metadata lists must contain strings.' });
        }
      }
    }
  }
  if (state.jianghu) {
    if (state.jianghu.schemaVersion !== 1) {
      issues.push({ path: 'jianghu.schemaVersion', message: 'Unsupported Jianghu schema version.' });
    }
    for (const npc of state.jianghu.npcs) {
      if (!npc.id.trim() || !npc.name.trim()) issues.push({ path: `jianghu.npcs.${npc.id}`, message: 'NPC id and name must not be empty.' });
      if (npc.disposition < -100 || npc.disposition > 100) issues.push({ path: `jianghu.npcs.${npc.id}.disposition`, message: 'NPC disposition must be within -100..100.' });
      for (const memory of npc.memories) {
        if (memory.confidence < 0 || memory.confidence > 100) issues.push({ path: `jianghu.npcs.${npc.id}.memories.${memory.id}.confidence`, message: 'Memory confidence must be within 0..100.' });
      }
    }
    for (const faction of state.jianghu.factions) {
      if (faction.resources < 0 || faction.resources > 100 || faction.influence < 0 || faction.influence > 100) {
        issues.push({ path: `jianghu.factions.${faction.id}`, message: 'Faction resources and influence must be within 0..100.' });
      }
      if (faction.playerReputation < -100 || faction.playerReputation > 100) {
        issues.push({ path: `jianghu.factions.${faction.id}.playerReputation`, message: 'Faction player reputation must be within -100..100.' });
      }
    }
  }

  for (const [key, value] of Object.entries(c.attributes)) {
    if (!Number.isFinite(value) || value < 0) {
      issues.push({ path: `character.attributes.${key}`, message: 'Attribute must be a finite non-negative number.' });
    }
  }

  if (c.wuxia) {
    const cultivation = c.wuxia.cultivation;
    if (!Number.isFinite(cultivation.qiControl) || cultivation.qiControl < 0 || cultivation.qiControl > 100) {
      issues.push({ path: 'character.wuxia.cultivation.qiControl', message: 'Qi control must be within 0..100.' });
    }
    if (!Number.isFinite(cultivation.meridianIntegrity) || cultivation.meridianIntegrity < 0 || cultivation.meridianIntegrity > 100) {
      issues.push({ path: 'character.wuxia.cultivation.meridianIntegrity', message: 'Meridian integrity must be within 0..100.' });
    }
    if (!Number.isFinite(cultivation.bottleneck) || cultivation.bottleneck < 0 || cultivation.bottleneck > 100) {
      issues.push({ path: 'character.wuxia.cultivation.bottleneck', message: 'Cultivation bottleneck must be within 0..100.' });
    }
    const social = c.wuxia.social;
    if (!Number.isFinite(social.reputation) || social.reputation < -100 || social.reputation > 100) {
      issues.push({ path: 'character.wuxia.social.reputation', message: 'Reputation must be within -100..100.' });
    }
    if (!Number.isFinite(social.face) || social.face < 0 || social.face > 100) {
      issues.push({ path: 'character.wuxia.social.face', message: 'Face must be within 0..100.' });
    }
    if (!Number.isFinite(social.trust) || social.trust < -100 || social.trust > 100) {
      issues.push({ path: 'character.wuxia.social.trust', message: 'Trust must be within -100..100.' });
    }
    if (!Number.isFinite(social.fear) || social.fear < 0 || social.fear > 100) {
      issues.push({ path: 'character.wuxia.social.fear', message: 'Fear must be within 0..100.' });
    }
    for (const [index, injury] of c.wuxia.injuries.entries()) {
      if (injury.severity < 1 || injury.severity > 5) {
        issues.push({ path: `character.wuxia.injuries[${index}].severity`, message: 'Injury severity must be 1..5.' });
      }
      if (injury.healingTurns < 0) {
        issues.push({ path: `character.wuxia.injuries[${index}].healingTurns`, message: 'Healing turns cannot be negative.' });
      }
    }
  }
  return issues;
}
