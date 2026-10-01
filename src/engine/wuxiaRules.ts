import type { MartialArt, WuxiaSimulationState } from './wuxia';
import type { CultivationStage } from './wuxia';

export const CULTIVATION_MAX_QI_MULTIPLIER: Record<CultivationStage, number> = {
  untrained: 1,
  tempering: 1.2,
  qi_gathering: 1.5,
  foundation: 2,
  core: 3,
  transcendent: 5,
};

export function martialPower(art: MartialArt): number {
  return Math.round((art.rank * 10) + art.mastery);
}

export function effectiveAttribute(
  character: WuxiaSimulationState,
  attribute: keyof WuxiaSimulationState['attributes'],
): number {
  const base = character.attributes[attribute];
  const fatiguePenalty = Math.floor(character.fatigue / 20);
  const injuryPenalty = character.wuxia.injuries.reduce((sum, injury) => sum + injury.severity, 0);
  return Math.max(0, base - fatiguePenalty - injuryPenalty);
}

export function qiRecovery(character: WuxiaSimulationState, baseAmount: number): number {
  const control = character.wuxia.cultivation.qiControl / 100;
  const meridian = character.wuxia.cultivation.meridianIntegrity / 100;
  const fatiguePenalty = Math.max(0.25, 1 - character.fatigue / 150);
  return Math.max(1, Math.floor(baseAmount * control * meridian * fatiguePenalty));
}
