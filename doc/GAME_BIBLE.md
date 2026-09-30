# QuantumWuxia — Game Bible
**Version:** 1.0 · **Status:** Foundational design baseline · **Date:** 2026-09-30

## 1. Product identity

**QuantumWuxia is an open-ended Jianghu simulation in which an AI narrates a persistent, rules-driven world whose people, sects, factions, economy, martial traditions, and history continue to evolve around the player.**

The experience is text-first, choice-based, and open-ended. The player may follow quests, pursue mastery, trade, investigate, cultivate relationships, travel, serve a sect, betray a patron, become a wandering physician, or invent a plausible goal of their own. The game should respond to actions rather than funnel every character through one authored plot.

The existing repository is a feature-rich prototype entering its **simulation-integration phase**. The objective is not to replace every existing screen. It is to give existing and future systems one coherent source of truth.

## 2. Pillars

1. **Player agency:** offer five contextual suggestions plus free-form Intent; never require the player to choose from a closed menu.
2. **Persistent causality:** actions change state; state changes later scenes, opportunities, prices, relationships, dangers, and rumors.
3. **A living Jianghu:** NPCs and organizations have goals and act when the player is elsewhere.
4. **Martial depth:** martial arts are learned disciplines with requirements, mastery, techniques, trade-offs, and counters—not merely names in a skill list.
5. **Social consequence:** reputation, Face (mianzi), obligations, promises, debts, grudges, and sect standing are distinct mechanics.
6. **Fair uncertainty:** the world may conceal information, but the rules that resolve actions remain consistent. The narrator may not rewrite outcomes after resolution.
7. **Wuxia first, fantasy additive:** martial skill, internal cultivation, honor, rivalries, wandering heroes, sects, and Jianghu society are foundational. Supernatural fantasy is an optional layer, not a replacement for martial logic.
8. **Readable continuity:** important facts, injuries, relationships, discoveries, and world events survive save/load and remain consistent.

## 3. Design boundaries

### Core wuxia layer
- Jianghu, sects, clans, schools, masters and disciples
- External martial skill, internal arts, qinggong, weapon styles
- Qi, meridians, internal injuries and cultivation bottlenecks
- Reputation, Face, etiquette, honor, rivalries and obligations
- Wounds, poison, medicine, fatigue, travel, weather and scarcity
- Rumors, secrets, investigation, tournaments, escort work, duels and sect conflict

### Optional fantasy layer
Spirit arts, demons, monsters, divine or otherworldly beings, magical relics, supernatural bloodlines, and other realms may exist as configurable world elements. Each setting should declare what is possible, rare, forbidden, or impossible. Do not assume every campaign has the same magic level.

### Not a goal for the next milestone
Multiplayer, voice narration, native mobile conversion, leaderboards, extra minigames, and additional cosmetic systems are deferred until the simulation core is coherent.

## 4. Non-negotiable simulation contract

**The LLM is not the game engine.**

- The LLM may interpret free-form intent into a structured proposed action.
- The simulation validates the proposal, checks requirements, resolves risk, and produces an authoritative outcome.
- A reducer applies legal state changes.
- The LLM narrates the already-resolved outcome and may propose future choices.
- Narration cannot grant items, change stats, move the player, complete quests, alter relationships, or kill an NPC unless those effects are present in the authoritative result.
- If AI output is invalid, incomplete, or unavailable, the deterministic simulation still runs; a safe fallback narrator can describe the result.
- Use injected random-number generation for tests and reproducible bug reports. Do not let the AI secretly choose success or failure.

### Turn pipeline
`Player choice / Intent → Intent interpretation → Action validation → Rule-based resolution → State reduction → Event log → AI narration → Contextual choices`

All state-changing effects should be represented as structured events or an equivalent validated result. UI components render state; they do not independently invent competing versions of it.

## 5. Canonical state domains

The long-term canonical model is divided into bounded domains. Existing screens can be migrated one at a time.

- **CharacterState:** identity, attributes, combat profile, resources, conditions, equipment, inventory, martial arts, knowledge, cultivation.
- **WorldState / JianghuState:** era/date, regions, locations, weather, season, laws, global flags, world events and active conflicts.
- **NPCState:** identity, goals, fears, secrets, abilities, resources, current location, plans, memories, beliefs, known rumors and obligations.
- **FactionState / SectState:** leadership, territory, resources, ideology, allies, rivals, internal conflicts, goals and player standing.
- **RelationshipState:** trust, respect, fear, affection, rivalry, obligations, promises, debts and grudges. Do not compress all social meaning into one disposition score.
- **QuestState:** objectives, prerequisites, status, deadline, stakeholders, evidence and consequences.
- **CombatState:** combatants, positions/range, turn/tempo, active conditions, technique choices and escape conditions.
- **KnowledgeState:** facts known to the world, player knowledge, each NPC's knowledge, rumors and truth confidence.
- **EconomyState:** currency, stock, scarcity, local prices, trade routes, debt and market disruption.
- **TimeState:** calendar, hour, elapsed action time, travel duration and time-dependent schedules.

A gradual migration is preferred over a risky all-at-once rewrite. During migration, define explicit adapters between the existing `GameState` and the new simulation state. Avoid maintaining two silently divergent sources of truth.

## 6. Character and martial model

### Character profile
- Identity: name, age, origin, appearance, history and chosen background
- Core attributes: strength, agility, constitution, perception, intelligence, charisma and luck
- Martial profile: external power, internal power, technique, movement/qinggong, weapon proficiency and intent/control
- Knowledge: medicine, poison, herbs, forging, appraisal, tracking, languages and scholarship
- Social position: reputation by region/faction, Face, sect, rank, allies, enemies, debts and obligations
- Conditions: wounds by body region, poison, illness, fatigue, hunger, internal injury and meridian damage
- Cultivation: current/max Qi, Qi control, meridian condition, realm/stage, bottlenecks and risks

### Martial arts
Every meaningful martial art should define:
- identity, type, origin/lineage and weapon or discipline
- rank, requirements, mastery and advancement method
- techniques/forms, costs, tactical strengths and weaknesses
- compatible/incompatible arts, counters and forbidden interactions
- teacher/source, discovery status and provenance

Example: **Azure River Sword** is not just a `skills: string[]` entry. It may contain named stances, mastery, reach, tempo, Qi cost, strengths against certain styles, and vulnerabilities to others.

### Qi is not generic mana
Qi is an internal resource governed by control, meridians, condition, training, technique and risk. Spell-like supernatural powers, if enabled, must be represented as a distinct tradition or explicitly mapped to the setting's cultivation rules.

## 7. Injury, defeat and recovery

Track meaningful conditions and their mechanical consequences. Examples:
- broken arm → reduced effectiveness with that arm and two-handed weapons
- damaged leg → slower travel and weaker qinggong
- internal injury → impaired Qi control/recovery and risk from forceful techniques
- untreated wound → infection, chronic damage or escalating cost
- poison → effects depend on substance, dose, time and treatment

Defeat should usually create a new situation rather than an automatic end screen: capture, robbery, ransom, humiliation, forced debt, rescue, a scar, lost equipment, a rival's mercy, or a dangerous escape. Death is possible when the setting and circumstances justify it, but should be clearly supported by the simulation and consequences. Do not use an arbitrary automatic revive as the default narrative rule.

## 8. Social simulation: reputation, Face and memory

- **Reputation:** what people believe about the player; may differ by region, faction, sect and social group.
- **Face / mianzi:** social standing in a specific context, affected by public challenges, etiquette, status, witnessed deeds and humiliation.
- **Trust:** expectation that the player will act reliably.
- **Respect:** recognition of ability, virtue, rank or achievement.
- **Fear:** perceived threat, separate from admiration.
- **Obligations:** promises, favors, debts, vows, patronage and disciple duties.
- **Memory:** NPCs remember concrete events and form beliefs from them. Memory is not a transcript dump; store concise event, interpretation, confidence, and relevance.

Example memory: “Player treated my brother after the ferry ambush; I believe they are skilled but secretive; I owe them 40 silver; I will not betray them unless my sect is threatened.”

## 9. Living world, factions and economy

Factions and sects need resources, territory, leadership, ideology, allies, enemies, internal tensions and current goals. They should be able to take bounded actions while the player is elsewhere.

Example causal chain: a sect attacks a caravan → the merchant guild raises escort rates → a rival sect offers protection → medicine becomes scarce in a nearby town → rumors spread and NPC schedules change.

World events should be seeded by state: location, season, weather, recent actions, reputation, active conflicts, faction plans, known rumors and available resources. Randomness can add variation, but events should not feel disconnected from the world.

Economy should model local stock and scarcity before attempting a complex global market. Prices and availability may change due to conflict, trade disruptions, harvests, player behavior, and merchant relationships.

## 10. Knowledge, secrets and rumors

Maintain distinct views of:
1. world truth;
2. what the player knows;
3. what each NPC knows or believes;
4. what is circulating as rumor;
5. confidence and provenance of each claim.

The narrator must not reveal hidden facts merely because they exist in the simulation state. Investigation, witnesses, documents, observation and deduction should update player knowledge. NPCs may be mistaken or deceptive, and rumors may mutate as they spread.

## 11. Time, travel and environment

Track game date, hour, elapsed time, season, weather, visibility and relevant terrain conditions. Actions consume context-sensitive time. These variables should affect NPC availability, travel, tracking, encounters, stealth, combat, illness and trade where applicable.

Do not simulate every distant actor every second. Use meaningful time advances and bounded world ticks, prioritizing nearby and consequential actors.

## 12. Player interaction

Each turn should normally offer:
- five contextual suggested choices;
- a free-form Intent field;
- visible feedback for meaningful costs and risks when the character could reasonably know them;
- an outcome that explains what changed, not only what happened narratively.

The five choices are suggestions, not the only legal actions. Intent should support creative but plausible actions. Ambiguous intent may trigger a short clarification rather than silently choosing a high-impact interpretation.

A proposed action schema should include action kind, target, approach, relevant tool/technique, intended goal, and risk posture. The resolver may return success, partial success, failure, or blocked, plus costs, state events and new complications.

## 13. AI roles and output rules

Separate prompts/contracts for:
- **Intent interpreter:** convert player language into a proposed structured action; do not resolve outcomes.
- **Choice generator:** suggest plausible actions from current known context and legal capabilities.
- **NPC dialogue:** speak from that NPC's knowledge, personality, goals and relationship history.
- **Narrator:** dramatize the authoritative result without adding unapproved state changes.
- **Optional world-event proposer:** suggest candidate events; simulation validates and schedules them.

Use runtime schema validation for model output. Treat all generated text as untrusted content, never executable instructions. Include concise relevant context, not the entire save file. Preserve deterministic rule outcomes across model/provider changes.

## 14. Existing repository integration strategy

Keep the current React + TypeScript + Vite + Zustand application and existing UI during the first milestone. Build a small engine layer that can be tested independently, then adapt existing store actions to call it.

Target structure (incremental, not a demand to move every existing file immediately):
- `src/engine/actions/`
- `src/engine/simulation/`
- `src/engine/consequences/`
- `src/engine/combat/`
- `src/engine/time/`
- `src/world/sects/`, `factions/`, `npcs/`, `economy/`, `rumors/`
- `src/character/martialArts/`, `injuries/`, `qi/`, `knowledge/`
- `src/ai/intentInterpreter.ts`, `narrator.ts`, `choiceGenerator.ts`, `npcDialogue.ts`, `schemas.ts`
- `src/state/` for canonical state and adapters

## 15. Delivery roadmap

### Milestone 1 — Simulation Core v1
- Establish typed simulation state and structured actions.
- Validate actions before resolution.
- Implement deterministic resolution with injectable randomness.
- Produce explicit costs, events and outcome text keys.
- Add pure unit tests for success, failure, invalid actions and state invariants.
- Keep the engine independent of React, Zustand, browser storage and any LLM SDK.

### Milestone 2 — Store adapter and AI boundary
- Add a narrow adapter from the existing game store.
- Split intent interpretation from narration.
- Enforce validated JSON output and safe fallbacks.
- Ensure narration cannot directly mutate canonical state.

### Milestone 3 — Wuxia foundations
- Qi and meridians, martial-art mastery, body-region injuries, poison/medicine.
- Sect membership/rank, reputation, Face, debts, promises and grudges.
- Contextual action choices.

### Milestone 4 — Living Jianghu
- NPC memories/plans, sect/faction turns, rumors, world events, travel/time and economy.
- Causal event chains and persistence.

### Milestone 5 — UI migration and balance
- Connect existing screens to canonical state via adapters.
- Add save migration, balancing, accessibility and regression coverage.

## 16. Definition of done for Simulation Core v1

- A proposed action is rejected or normalized before any mutation.
- The same state + action + injected roll produces the same result.
- Resolution returns structured outcome data and does not call an LLM.
- State invariants are checked at boundaries.
- The engine has no UI/storage/provider dependencies.
- Tests cover at least success, failure, blocked action, invalid roll handling, and non-mutation of input state.
- Existing UI and save data are not silently broken by the new module.

## 17. Reference philosophy

Blade RPG is a reference for the interaction pattern—contextual choices plus free-form intent, consequences that persist, and defeat that can continue the story—not a template to copy wholesale. QuantumWuxia should preserve its own Wuxia-plus-fantasy identity, deeper sect/world simulation, and configurable supernatural layer.

## 18. Change control

Treat this bible as the current baseline. Update it when a design decision changes; record the reason and affected systems. Prefer explicit versioned decisions over silent drift. New features should identify which canonical state they read, which events they emit, and which tests protect their behavior.
