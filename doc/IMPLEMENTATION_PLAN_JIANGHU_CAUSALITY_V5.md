# Jianghu Causality v5 — Branching Consequences & Reactive World State

## Goal
Extend v4 causal chains into bounded, deterministic reactions across factions, NPCs, markets, locations, and player knowledge.

## Rules
- The deterministic simulation remains authoritative.
- A causal chain advances at most once per turn.
- Branch selection is deterministic from authoritative state.
- Consequences mutate concrete world state.
- LLM narration may describe results but cannot choose branches or mutate state.
- Temporary location conditions expire by turn.
- Knowledge can transition from unknown to true/false only through deterministic verification.

## Branches
- escalate: increase event severity and pressure
- deescalate: reduce pressure
- suppress: reduce information pressure
- confirm: verify a knowledge record as true
- false: verify a knowledge record as false
- react: bounded social/location reaction

## Integration
1. player action
2. direct Jianghu consequence
3. Jianghu tick
4. v3 causality
5. v4 information processing
6. v4 causal-chain advancement
7. v5 reactive branching

## Verification
GitHub connector cannot execute local npm/typecheck/test commands. Run the project's normal local verification after pulling the branch.
