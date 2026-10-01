/**
 * QuantumWuxia Simulation Core v1
 * Small, provider-independent contracts for authoritative action resolution.
 * This is an isolated foundation; it does not replace the legacy GameState yet.
 */

export type ActionKind =
  | 'inspect'
  | 'talk'
  | 'travel'
  | 'stealth'
  | 'attack'
  | 'meditate'
  | 'rest'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ResolutionStatus = 'success' | 'partial' | 'failure' | 'blocked';

export interface SimCondition {
  id: string;
  severity: number; // 1..5
  bodyRegion?: 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'internal';
  durationTurns?: number;
}

import type { WuxiaCharacter } from './wuxia';
import type { JianghuState } from './jianghu';

export interface SimCharacter {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  fatigue: number; // 0..100
  attributes: {
    strength: number;
    agility: number;
    constitution: number;
    perception: number;
    intelligence: number;
    charisma: number;
    luck: number;
  };
  conditions: SimCondition[];
  inventory: string[];
  locationId: string;
  /** Wuxia-specific mechanics; optional for legacy save compatibility. */
  wuxia?: WuxiaCharacter;
}

export interface SimWorld {
  turn: number;
  locationIds: string[];
  knownFacts: string[];
  /** Player-known information only; world truth remains in jianghu. */
  knownRumorIds?: string[];
  knownNpcIds?: string[];
}

export interface SimulationState {
  schemaVersion: 1;
  character: SimCharacter;
  world: SimWorld;
  /** Persistent world truth; never authored by the LLM. */
  jianghu?: JianghuState;
}

export interface ProposedAction {
  kind: ActionKind;
  description: string;
  /** Canonical actor; defaults to the player when omitted by legacy callers. */
  actorId?: string;
  targetId?: string;
  destinationId?: string;
  approach?: string;
  toolId?: string;
  techniqueId?: string;
  intendedGoal?: string;
  risk: RiskLevel;
  /** Player-selected risk posture; distinct from resolver-calculated world difficulty. */
  riskPosture?: RiskLevel;
  conditionalClauses?: string[];
  declaredConstraints?: string[];
  qiCost?: number;
  timeCost?: number;
}

export interface StateEvent {
  type:
    | 'action.resolved'
    | 'character.hp_changed'
    | 'character.qi_changed'
    | 'character.fatigue_changed'
    | 'character.injury_added'
    | 'character.social_changed'
    | 'world.location_changed'
    | 'world.fact_discovered'
    | 'world.relationship_changed'
    | 'world.npc_memory_added'
    | 'world.jianghu_ticked'
    | 'world.rumor_spread'
    | 'world.npc_goal_completed'
    | 'world.obligation_changed'
    | 'world.faction_conflict'
    | 'world.market_changed'
    | 'world.npc_action'
    | 'world.causal_chain_advanced'
    | 'world.causal_chain_completed'
    | 'world.causal_branch_selected'
    | 'world.faction_reaction'
    | 'world.location_reaction';
  payload: Record<string, string | number | boolean | null>;
}

export interface ActionResolution {
  status: ResolutionStatus;
  summary: string;
  action: ProposedAction;
  state: SimulationState;
  events: StateEvent[];
  roll: number;
  difficulty: number;
}
