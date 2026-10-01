# QuantumWuxia — Jianghu Causality v2

## Purpose

This layer makes information and intentions part of the simulation without allowing the AI narrator to become authoritative.

### World truth vs player knowledge

World truth lives in `SimulationState.jianghu`.

Player knowledge lives in:
- `knownFacts`
- `knownRumorIds`
- `knownNpcIds`

The player should only receive information they have actually learned.

### Rumors

Rumors now have:
- origin
- location
- credibility
- status
- known recipients
- spread rate
- creation turn

Rumors can propagate to NPCs at the same location when credibility and disposition make transmission plausible.

### NPC goals

NPCs have structured goals with:
- kind
- description
- target
- priority
- progress
- active/completed state

Goals advance during world ticks, allowing NPCs to pursue agendas independently of the player.

### Faction consequences

Interactions with faction-affiliated NPCs now influence the player's faction reputation:
- constructive interaction can improve reputation
- hostile interaction can reduce it

This establishes the first causal bridge from NPC relationships to faction politics.

## Next

The next layer should make these systems interact more deeply:

1. obligations and debts becoming actionable
2. NPC-to-NPC relationships and information exchange
3. faction-versus-faction conflicts
4. economic scarcity and trade consequences
5. autonomous NPC actions with meaningful world events
6. explicit knowledge provenance and discovery mechanics
