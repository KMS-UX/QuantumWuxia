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
  if (!state.world.locationIds.includes(c.locationId)) {
    issues.push({ path: 'character.locationId', message: 'Current location must exist in world.locationIds.' });
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
