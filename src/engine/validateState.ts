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
  return issues;
}
