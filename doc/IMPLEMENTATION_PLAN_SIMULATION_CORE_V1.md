# Implementation Plan — Simulation Core v1

## Current scope
This bundle adds an isolated, pure TypeScript foundation. It is intentionally **not wired into Zustand yet**; that is the next integration step after validating the core against the current store and existing save shape.

## Files
- `src/engine/simulation-core-v1/types.ts` — small canonical prototype state and action/result contracts.
- `src/engine/simulation-core-v1/resolveAction.ts` — pure deterministic resolver with injectable roll.
- `src/engine/simulation-core-v1/validateState.ts` — state invariant checks.
- `src/engine/simulation-core-v1/resolveAction.test.ts` — dependency-free test cases using Node assertions (adapt execution to the repo's chosen TS test runner).

## Deliberate constraints
- No LLM calls, UI imports, persistence, Zustand, or random global calls in the resolver.
- Resolver accepts a roll as an argument; production caller supplies a seeded RNG, tests supply fixed values.
- State changes are returned as a new state object; input state is not mutated.
- Initial action set is intentionally small. Extend through explicit action definitions, not ad hoc prompt side effects.
- `legacyCharacter`/save adapter is not included yet because the existing `Character` type lacks constitution, perception, Qi, injuries, and stable world/NPC identifiers. Avoid guessing conversions before deciding migration defaults.

## Acceptance checklist
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Execute the unit test file through a configured TypeScript test runner or compile it in the project test setup.
- [ ] Review edge cases for HP/Qi bounds and action costs.
- [ ] Add an explicit adapter and a save-version migration before connecting to live saves.
