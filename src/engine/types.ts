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
}

export interface SimWorld {
  turn: number;
  locationIds: string[];
  knownFacts: string[];
}

export interface SimulationState {
  schemaVersion: 1;
  character: SimCharacter;
  world: SimWorld;
}

export interface ProposedAction {
  kind: ActionKind;
  description: string;
  targetId?: string;
  destinationId?: string;
  approach?: string;
  risk: RiskLevel;
  qiCost?: number;
  timeCost?: number;
}

export interface StateEvent {
  type:
    | 'action.resolved'
    | 'character.hp_changed'
    | 'character.qi_changed'
    | 'character.fatigue_changed'
    | 'world.location_changed'
    | 'world.fact_discovered';
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
