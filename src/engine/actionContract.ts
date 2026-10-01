import type { ProposedAction, SimulationState } from './types';

export type ActionContractIssue = {
  path: string;
  message: string;
};

export type ActionContractPrecondition = {
  source: 'conditional' | 'constraint';
  expression: string;
};

function normalizeExpression(expression: string): string {
  return expression.trim().replace(/\s+/g, ' ');
}

function extractPreconditions(action: ProposedAction): ActionContractPrecondition[] {
  return [
    ...(action.conditionalClauses ?? []).map(expression => ({
      source: 'conditional' as const,
      expression: normalizeExpression(expression),
    })),
    ...(action.declaredConstraints ?? []).map(expression => ({
      source: 'constraint' as const,
      expression: normalizeExpression(expression),
    })),
  ].filter(precondition => precondition.expression.length > 0);
}

/**
 * Supported deterministic preconditions intentionally use a tiny vocabulary:
 * - only if qi >= N
 * - only if carrying ITEM
 * - only if at LOCATION
 * - without ITEM
 *
 * Other natural-language clauses remain descriptive metadata and are not
 * silently promoted into game rules.
 */
function evaluatePrecondition(
  state: SimulationState,
  precondition: ActionContractPrecondition,
): ActionContractIssue | undefined {
  const expression = precondition.expression;

  let match = expression.match(/^only if qi\s*(?:>=|at least)\s*(\d+)$/i);
  if (match) {
    const requiredQi = Number(match[1]);
    if (state.character.qi < requiredQi) {
      return {
        path: precondition.source === 'conditional' ? 'conditionalClauses' : 'declaredConstraints',
        message: `Precondition failed: requires at least ${requiredQi} Qi.`,
      };
    }
    return undefined;
  }

  match = expression.match(/^only if carrying\s+(.+)$/i);
  if (match) {
    const itemId = match[1].trim();
    if (!state.character.inventory.includes(itemId)) {
      return {
        path: precondition.source === 'conditional' ? 'conditionalClauses' : 'declaredConstraints',
        message: `Precondition failed: item "${itemId}" is required.`,
      };
    }
    return undefined;
  }

  match = expression.match(/^only if at\s+(.+)$/i);
  if (match) {
    const locationId = match[1].trim();
    if (state.character.locationId !== locationId) {
      return {
        path: precondition.source === 'conditional' ? 'conditionalClauses' : 'declaredConstraints',
        message: `Precondition failed: actor must be at "${locationId}".`,
      };
    }
    return undefined;
  }

  match = expression.match(/^without\s+(.+)$/i);
  if (match) {
    const itemId = match[1].trim();
    if (state.character.inventory.includes(itemId)) {
      return {
        path: precondition.source === 'conditional' ? 'conditionalClauses' : 'declaredConstraints',
        message: `Precondition failed: item "${itemId}" must not be carried.`,
      };
    }
  }

  return undefined;
}

export function normalizeProposedAction(
  state: SimulationState,
  action: ProposedAction,
): ProposedAction {
  return {
    ...action,
    actorId: action.actorId ?? state.character.id,
    riskPosture: action.riskPosture ?? action.risk,
  };
}

export function validateProposedAction(
  state: SimulationState,
  action: ProposedAction,
): ActionContractIssue[] {
  const issues: ActionContractIssue[] = [];

  if (!action.actorId) {
    issues.push({ path: 'actorId', message: 'Canonical actions must identify an actor.' });
  } else if (action.actorId !== state.character.id) {
    issues.push({
      path: 'actorId',
      message: 'The action actor must match the current simulation character.',
    });
  }

  if (!action.description.trim()) {
    issues.push({ path: 'description', message: 'Action description must not be empty.' });
  }

  if (action.destinationId !== undefined && !state.world.locationIds.includes(action.destinationId)) {
    issues.push({
      path: 'destinationId',
      message: 'Destination must exist in world.locationIds.',
    });
  }

  if (action.targetId !== undefined) {
    const targetExists = state.jianghu?.npcs.some(npc => npc.id === action.targetId) ?? false;
    if (!targetExists) {
      issues.push({
        path: 'targetId',
        message: 'Target must reference a known Jianghu NPC.',
      });
    }
  }

  if (action.toolId !== undefined && !state.character.inventory.includes(action.toolId)) {
    issues.push({
      path: 'toolId',
      message: 'Tool must be present in the character inventory.',
    });
  }

  if (action.techniqueId !== undefined) {
    const techniqueExists = state.character.wuxia?.martialArts.some(art =>
      art.techniques.some(technique => technique.id === action.techniqueId),
    ) ?? false;
    if (!techniqueExists) {
      issues.push({
        path: 'techniqueId',
        message: 'Technique must be known by the character.',
      });
    }
  }

  for (const [field, clauses] of [
    ['conditionalClauses', action.conditionalClauses],
    ['declaredConstraints', action.declaredConstraints],
  ] as const) {
    if (clauses?.some(clause => !clause.trim())) {
      issues.push({
        path: field,
        message: 'Contract clauses must not contain empty entries.',
      });
    }
  }

  issues.push(
    ...extractPreconditions(action)
      .map(precondition => evaluatePrecondition(state, precondition))
      .filter((issue): issue is ActionContractIssue => issue !== undefined),
  );

  if (action.qiCost !== undefined && (!Number.isFinite(action.qiCost) || action.qiCost < 0)) {
    issues.push({ path: 'qiCost', message: 'Qi cost must be a finite non-negative number.' });
  }
  if (action.timeCost !== undefined && (!Number.isFinite(action.timeCost) || action.timeCost < 0)) {
    issues.push({ path: 'timeCost', message: 'Time cost must be a finite non-negative number.' });
  }

  return issues;
}
