# QuantumWuxia — Jianghu Causality v3

## Purpose

Jianghu Causality v3 turns persistent social state into bounded world pressure.

The authoritative loop remains:

`player action -> deterministic resolver -> Jianghu mutation -> autonomous tick -> narrator`

The LLM still does not decide success, inventory changes, relationships, prices, faction conflicts, or autonomous outcomes.

## Systems

### 1. Actionable obligations

Unfulfilled obligations can become overdue.

An overdue obligation deterministically:
- reduces trust between debtor and creditor
- increases grudge according to obligation severity
- emits `world.obligation_changed`
- remains persistent until fulfilled or otherwise resolved by a future system

This creates a concrete path from promises/debts to social consequences.

### 2. NPC-to-NPC relationships

Relationships are no longer restricted to the player.

When NPCs share a location, v3 can establish an initial relationship based on faction affiliation. Future world events can mutate those relationships.

This provides the graph needed for:
- alliances
- rivalries
- debt networks
- information exchange
- faction influence through individuals

### 3. Faction pressure

Faction pairs now have:
- trust
- hostility
- trade relationship

Resource scarcity and internal tension can increase hostility. Sustained high hostility can create a persistent faction conflict world event.

### 4. Local economy

Markets are canonical Jianghu state.

A market tracks:
- local stock
- base prices
- scarcity
- price multipliers
- last update turn

Prices are derived deterministically from scarcity. Autonomous NPC trade can modify stock.

This is intentionally a small local economy rather than a full economic simulation.

### 5. Autonomous NPC actions

NPC goals now have a bounded action budget per world tick.

Supported first-pass autonomous effects include:
- travel goals moving an NPC
- trade goals modifying local stock/resources
- debt-collection goals increasing social pressure
- investigation goals strengthening rumor credibility
- protection goals reducing local event severity

At most three autonomous NPC actions occur per tick in v3. This prevents uncontrolled simulation explosion.

### 6. Knowledge boundary

World truth remains in `JianghuState`.

Player knowledge remains in:
- `knownFacts`
- `knownRumorIds`
- `knownNpcIds`

The narrator receives authoritative context but cannot directly write these systems.

## Integration

`resolveAction` now:
1. clones the authoritative simulation state
2. resolves the player's action
3. applies direct Jianghu consequences
4. advances the world turn
5. runs the existing Jianghu tick
6. runs v3 causality
7. validates the resulting simulation state

The resulting state is then bridged back into the legacy `GameState`.

## Tests

Added `jianghuCausalityV3.test.ts` covering:
- immutable NPC-to-NPC relationship creation
- overdue obligation pressure
- scarcity-derived market pricing
- bounded autonomous action count

No test runner was executed through the GitHub integration; the repository should run its configured local typecheck/test commands before merging.
