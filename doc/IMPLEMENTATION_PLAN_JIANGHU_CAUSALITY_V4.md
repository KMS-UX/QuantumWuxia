# QuantumWuxia — Jianghu Causality v4

## Purpose

v4 turns the Jianghu's information systems into explicit, inspectable causal machinery.

The authoritative flow remains:

`player input -> deterministic simulation -> world consequences -> information processing -> causal chains -> narrator`

The LLM remains a narration and interpretation layer. It does not decide whether a fact is true, whether a rumor was learned, or whether a consequence occurred.

## 1. Knowledge provenance

`KnowledgeRecord` records:
- subject who knows the fact
- fact itself
- source ID
- source kind
- confidence
- discovery turn
- optional verification state

Supported source kinds:
- direct observation
- NPC
- rumor
- document
- observation
- faction

This prevents the simulation from treating "the player knows X" as equivalent to "X is objectively true."

## 2. Player knowledge boundary

Player knowledge remains separate from world truth.

The player has:
- `knownFacts`
- `knownRumorIds`
- `knownNpcIds`

The Jianghu has:
- NPC memories
- rumors
- secrets
- world events
- knowledge provenance records

Information is promoted into player knowledge only through deterministic discovery rules.

## 3. Causal chains

World events can now create `CausalChainState`.

Each chain records:
- root event
- current step
- category
- description
- source IDs
- active state
- next evaluation turn

An active chain advances at most one step per eligible tick.

This makes consequences inspectable rather than collapsing an entire sequence into one opaque event.

## 4. Initial consequence rules

### Information events
Rumor-based events can increase their severity as they propagate.

### Faction events
Faction conflicts increase internal faction tension.

### Economic events
Market events increase local scarcity, which feeds the v3 price model.

### Later chain steps
Local NPC disposition can be affected by persistent active consequences.

These are intentionally small first-pass rules. v5 can add explicit chain branching and prerequisites.

## 5. Integration

The resolver now executes:

1. player action
2. direct Jianghu consequence
3. Jianghu tick
4. v3 autonomous/economic pressure
5. v4 information processing
6. v4 causal-chain advancement
7. final state validation

## 6. Tests

Added coverage for:
- knowledge provenance
- rumor → player knowledge
- causal-chain advancement
- bounded chain completion

The GitHub integration does not execute the repository's local `npm run typecheck` command, so typecheck/test execution remains a local verification step before merge.
