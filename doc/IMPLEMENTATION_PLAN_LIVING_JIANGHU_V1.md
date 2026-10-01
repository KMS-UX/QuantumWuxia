# QuantumWuxia — Living Jianghu v1

## Goal

Make the world a persistent simulation rather than a collection of UI-only systems.

The authoritative runtime pipeline remains:

`PLAYER INPUT → ACTION INTERPRETER → WORLD SIMULATOR → STATE REDUCER → AI NARRATOR`

The LLM may describe and interpret intent, but it does not directly mutate authoritative world state.

## Canonical World State

`SimulationState.jianghu` contains:

- NPCs and persistent memories
- factions/sects with resources, influence, territory, goals, and internal tension
- directed relationships with trust, respect, fear, affection, debt, and grudges
- rumors with provenance, credibility, and local propagation
- obligations such as debts, favors, promises, oaths, and duties
- active world events

## Current v1 behavior

### NPC memory

Talking to or attacking a known NPC can create a persistent memory and relationship record.

Memories contain:
- event
- interpretation
- valence
- confidence
- turn

### Relationships

Relationships are directed and persistent. Player-facing legacy relationship data is derived from the canonical relationship records so existing UI continues to function.

### Factions

Factions have resources, influence, territory, goals, allies, enemies, internal tension, and player reputation.

A small deterministic tick currently allows resource pressure and tension to drift without player input.

### World tick

Every resolved non-blocked action advances the Jianghu tick.

The tick may:
- move faction-aligned NPCs
- adjust faction pressure
- adjust rumor credibility
- expire world events

## AI boundary

The narrator receives a filtered simulation context rather than raw authoritative state. It may describe known NPCs, local rumors, and confirmed outcomes, but cannot invent state mutations.

## Next integration targets

1. Explicit player knowledge vs world truth.
2. Rumor creation and propagation through NPC networks.
3. Obligations/debts becoming actionable simulation constraints.
4. Faction relationship consequences from player actions.
5. NPC autonomous goals and scheduled actions.
6. Economy and local scarcity.
7. Defeat/capture consequences connected to NPC and faction state.
