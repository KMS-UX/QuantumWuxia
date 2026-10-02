# QuantumWuxia — Decision Log

Candidate Bible §18 entries from the v2-v5 work. Each says what changed, why, and which systems it touches. Merge into `GAME_BIBLE.md` or reject.

| # | Decision | Reason | Affects |
|---|---|---|---|
| D1 | The playable world is authored in `src/world/content` and builds a complete `SimulationState` from an origin (`createWuxiaSimulation`). The legacy Human/Elf/Warrior/Mage creation flow is replaced. | The live game was a one-location world with generic fantasy characters; Bible §1, §3, §7. | creation UI, store `startNewGame`, `Character.originId` |
| D2 | A successful `talk` makes the NPC share at most one rumor they know and the player does not (highest credibility first). Secrets are never shared this way. | Knowledge tracking existed but nothing ever told the player anything; Bible §10. | `resolveAction`, `npcDisclosure.ts` |
| D3 | The narrator receives a perception-filtered digest, not the raw result. It never contains secrets, NPC goals/fears, offscreen NPC actions or faction bookkeeping; a test fails if any appears. | Bible §4 and §10: the narrator must not reveal hidden facts. | `narratorDigest.ts`, store |
| D4 | All LLM `stateUpdates` are dropped except a validated `locationChange`, which only the new-game opening reads. | Bible §4: narration cannot change state. | `src/ai/validateNarration.ts` |
| D5 | World events may carry `pace {steps, interval}`; default is unchanged (3 stages, 1 turn apart). | Seeded tensions resolved in about 4 turns, far faster than their authored timescale. | `jianghu.ts`, V4, V5, seed |
| D6 | Faction `internalTension` cools 1 every third turn and not at all while the faction is in an active event (was: -1 every turn). | The old rule always drained tension to 0, so slow-burn pressure could not build. **Changes tuning for every game.** | `tickJianghu` |
| D7 | Finales are serializable data on world events, evaluated deterministically when a chain completes; the event then ends. Engine never imports content. | Bible §2.2, §9: state changes later scenes; keeps saves self-contained. | `finale.ts`, V4, content |
| D8 | A finale witnessed by the player (present at the event's location) becomes an `observation` knowledge record; otherwise the player is only told through rumors at named locations. | Bible §10: the player knows only what they could learn. | `finale.ts`, digest |
| D9 | If the narrator fails or is unavailable, the resolved turn is committed anyway with a deterministic account and deterministic choices. | Bible §4 (previously the turn was lost). | store `narrateResolvedTurn`, `fallbackNarrator.ts` |
| D10 | The narrator's choices are filtered to what the rules can honour and backfilled by a deterministic generator. | Bible §13 choice-generator contract. | `choiceGenerator.ts` |
| D11 | Rolls come from a saved seed and draw counter (`world.rng`); roll N = f(seed, N). Older saves get a seed on their first action. | Bible §4: reproducible bug reports. | `rng.ts`, `actionPipeline.ts`, `validateState` |

## Open decisions (not made)
- **V5 causal branching is never reached in live play** (V4 sets the shared timer first). Activating it changes outcomes: its default branch for low-severity faction events is "de-escalate", which would end disputes early. Recommendation: do not activate until finales cover the branches it would otherwise decide.
- **Time model** (hour/date/season/weather, travel duration from the weighted map): Bible §11, absent.
- **Defeat model** to replace `revive()`: capture, ransom, forced debt, scar, per Bible §7.
- **Resolver depth**: techniques, Qi cost, mastery and counters.
