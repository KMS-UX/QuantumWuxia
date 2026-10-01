import type { SimCondition, SimCharacter } from './types';

export type CultivationStage =
  | 'untrained'
  | 'tempering'
  | 'qi_gathering'
  | 'foundation'
  | 'core'
  | 'transcendent';

export type MartialArtType =
  | 'external'
  | 'internal'
  | 'sword'
  | 'saber'
  | 'spear'
  | 'fist'
  | 'palm'
  | 'qinqong'
  | 'hidden_weapon'
  | 'medicine'
  | 'poison'
  | 'other';

export interface MartialTechnique {
  id: string;
  name: string;
  description: string;
  qiCost: number;
  mastery: number; // 0..100
}

export interface MartialArt {
  id: string;
  name: string;
  type: MartialArtType;
  origin?: string;
  rank: number; // 1..9
  mastery: number; // 0..100
  techniques: MartialTechnique[];
  compatibleArts?: string[];
  incompatibleArts?: string[];
  weaknesses?: string[];
}

export interface CultivationState {
  stage: CultivationStage;
  qiControl: number; // 0..100
  meridianIntegrity: number; // 0..100
  bottleneck: number; // 0..100; higher means harder to advance
  accumulatedInsight: number;
}

export interface Injury extends SimCondition {
  id: string;
  severity: number; // 1..5
  bodyRegion: NonNullable<SimCondition['bodyRegion']>;
  healingTurns: number;
  untreated: boolean;
}

export interface SocialStanding {
  reputation: number; // -100..100
  face: number; // 0..100
  trust: number; // -100..100
  fear: number; // 0..100
}

export interface WuxiaCharacter {
  cultivation: CultivationState;
  martialArts: MartialArt[];
  injuries: Injury[];
  social: SocialStanding;
}

export interface WuxiaSimulationState extends SimCharacter {
  wuxia: WuxiaCharacter;
}

export const DEFAULT_CULTIVATION: CultivationState = {
  stage: 'untrained',
  qiControl: 10,
  meridianIntegrity: 100,
  bottleneck: 0,
  accumulatedInsight: 0,
};

export const DEFAULT_SOCIAL_STANDING: SocialStanding = {
  reputation: 0,
  face: 50,
  trust: 0,
  fear: 0,
};

export function createDefaultWuxiaCharacter(character: SimCharacter): WuxiaSimulationState {
  return {
    ...character,
    conditions: character.conditions.map(condition => ({ ...condition })),
    inventory: [...character.inventory],
    wuxia: {
      cultivation: { ...DEFAULT_CULTIVATION },
      martialArts: [],
      injuries: [],
      social: { ...DEFAULT_SOCIAL_STANDING },
    },
  };
}

export function syncInjuries(character: WuxiaSimulationState): WuxiaSimulationState {
  const injuries = character.wuxia.injuries.map(injury => ({ ...injury }));
  return {
    ...character,
    conditions: injuries.map(injury => ({
      id: injury.id,
      severity: injury.severity,
      bodyRegion: injury.bodyRegion,
      durationTurns: injury.healingTurns,
    })),
    wuxia: {
      ...character.wuxia,
      injuries,
    },
  };
}
