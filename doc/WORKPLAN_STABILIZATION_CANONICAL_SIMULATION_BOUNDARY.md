# QuantumWuxia — Stabilization + Canonical Simulation Boundary Workplan

**Status:** Approved / In progress  
**Baseline:** `main` after Jianghu Causality v5  
**Work branch:** `explicit-legacy-simulation-migration`  
**Date:** 2026-10-01

## 1. Purpose

This milestone makes the current simulation architecture trustworthy before adding another major gameplay subsystem.

The immediate goals are:

1. restore source integrity and establish a verified build baseline;
2. make `SimulationState` the explicit authoritative state used by deterministic gameplay;
3. keep `GameState` as a temporary UI/save compatibility model during migration;
4. prevent new engine code from silently creating a second source of truth;
5. preserve the existing Jianghu causality v5 work rather than replacing it.

This is an incremental stabilization pass, **not** a rewrite.

---

## 2. Current architectural decision

### Authoritative model

`SimulationState` is the canonical simulation model.

It owns deterministic gameplay state such as:

- player resources and conditions;
- current location;
- world knowledge;
- Jianghu truth;
- NPC/faction state represented by Jianghu;
- Wuxia/cultivation state.

### Compatibility model

`GameState` remains temporarily responsible for:

- React/UI-facing legacy fields;
- save compatibility;
- turn/narrative history;
- existing store integration.

The long-term direction is to replace direct gameplay reads/writes against legacy fields with selectors/view models derived from canonical simulation state.

### Boundary

All deterministic gameplay follows:

`GameState → SimulationState → deterministic engine → SimulationState → GameState`

The LLM remains outside the authoritative mutation path:

`Intent → ProposedAction → resolver → authoritative result → narration`

The narrator never becomes an alternate state reducer.

---

## 3. Phase 0 — Stabilization

### P0.1 Source integrity

- [x] Inspect current `actionInterpreter.ts`.
- [x] Identify malformed literal escape sequences in executable TypeScript.
- [x] Replace them with real source newlines.
- [ ] Run TypeScript validation (CI workflow added; awaiting GitHub execution).
- [ ] Run production build (CI workflow added; awaiting GitHub execution).
- [ ] Record any remaining compiler/build failures.

### P0.2 Determinism and validation

Verify that:

- `resolveAction()` does not mutate its input;
- injected rolls are range checked;
- invalid state is rejected before resolution;
- final state is validated before return;
- no LLM call is required by the resolver.

### P0.3 Regression coverage

Minimum coverage for the next test pass:

- successful action;
- partial result;
- failure;
- blocked travel;
- insufficient Qi;
- invalid roll;
- invalid input state;
- input state remains unchanged;
- deterministic result for identical state/action/roll.

If a test runner is not yet configured, add the smallest provider-independent test harness rather than pulling in a large framework solely for this milestone.

---

## 4. Phase 1 — Canonical simulation boundary

### P1.1 Explicit boundary module

Introduce `src/engine/simulationBoundary.ts`.

Responsibilities:

- enter the deterministic engine from legacy `GameState`;
- validate the resulting `SimulationState`;
- exit the engine back to the compatibility model;
- make the migration seam visible and searchable.

### P1.2 Keep adapters narrow

`simulationAdapter.ts` remains an implementation detail of the boundary.

Do not add new gameplay rules to the adapter.

Do not make UI components construct or mutate `SimulationState` directly.

### P1.3 Store integration rule

Existing store actions may continue to use `GameState`, but gameplay resolution must cross the boundary once per action.

Direct legacy mutations that also modify simulation state are migration debt and should be removed incrementally.

Known follow-up area:

- the current `revive()` action modifies legacy character data and simulation data separately. It should eventually become an authoritative simulation action/reducer.

---

## 5. Phase 2 — Remove semantic drift

The current adapter contains legacy approximations that must be made explicit before they become hidden mechanics:

- `constitution ← strength`
- `perception ← agility`
- legacy `mana ←→ Qi`

These are compatibility mappings, not final game design.

Next pass:

1. document each mapping;
2. identify the canonical source field;
3. add migration tests;
4. replace approximations with explicit character-state data where required;
5. remove compatibility shortcuts once save migration is available.

---

## 6. Phase 3 — Strengthen the action contract

The current `ProposedAction` is intentionally small. Expand it only after the boundary is stable.

Target fields:

- action kind;
- actor;
- target;
- destination;
- approach;
- tool/weapon;
- technique;
- intended goal;
- player risk posture;
- conditional clauses;
- declared constraints.

Important distinction:

**Player risk posture is not world danger.**

The player may choose to act cautiously or aggressively, but the resolver calculates actual difficulty from world state, capabilities, conditions, environment, opposition and consequences.

---

## 7. Phase 4 — Event ledger

Add a first-class machine-readable event record after the boundary is stable.

Minimum event metadata:

- event id;
- turn/time;
- actor;
- action;
- targets;
- location;
- causes;
- effects;
- witnesses;
- knowledge consequences;
- provenance;
- causal links.

The existing `StateEvent` mechanism is the starting point, but it should eventually carry enough information to support:

- NPC memory;
- rumors;
- investigations;
- faction reactions;
- causal chains;
- replay/debugging;
- concise AI context.

Narrative text should remain separate from the machine event record.

---

## 8. Phase 5 — Living Jianghu

After stabilization, build NPC agency as:

`Goal → Plan → Opportunity → Action → Consequence`

Use bounded simulation ticks. Do not attempt to simulate every distant NPC every second.

The existing Jianghu causality v3/v4/v5 systems should become consumers of canonical events/state rather than parallel state authorities.

---

## 9. Phase 6 — Wuxia depth

After the core is trustworthy:

- Qi and meridians;
- martial-art mastery and techniques;
- body-region injuries;
- poison/medicine;
- sect membership/rank;
- reputation, Face, debts and obligations;
- deeper combat state.

These systems should emit structured consequences through the same canonical boundary.

---

## 10. Phase 7 — AI boundary

The AI layer should be divided into contracts:

1. **Intent interpreter** — language → proposed action.
2. **Choice generator** — state/context → legal suggestions.
3. **NPC dialogue** — NPC knowledge/personality → dialogue.
4. **Narrator** — authoritative resolution → prose.
5. **Optional world-event proposer** — candidate event → simulation validation.

No AI component should directly mutate canonical state.

---

## 11. Acceptance criteria for this milestone

This milestone is complete when:

- [ ] the repository typechecks;
- [ ] the production build succeeds;
- [ ] deterministic engine tests pass;
- [ ] `actionInterpreter.ts` contains valid TypeScript source;
- [ ] `SimulationState` is explicitly documented as canonical;
- [x] player action resolution crosses one visible boundary;
- [x] invalid simulation state cannot be committed;
- [ ] the resolver remains independent of React, Zustand, storage and LLM providers;
- [ ] existing Jianghu causality v5 behavior remains intact;
- [ ] no new gameplay system creates a second authoritative state model.

---

## 12. Definition of done

The milestone is **not** “the code has been refactored.”

It is done when the project can demonstrate:

> Given a valid canonical simulation state, a structured proposed action, and an injected random roll, the deterministic engine produces the same validated result every time, without consulting an LLM or UI state.

That property is the foundation for everything that follows.
