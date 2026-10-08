import { regionName } from '../engine/bout';
import { describeDuration, describeTime } from '../engine/clock';
import { environmentAt } from '../engine/environment';
import { weatherWord } from '../engine/weather';
import type { ActionResolution, ResolutionStatus, StateEvent } from '../engine/types';

export interface FallbackNarratorOptions {
  /** Observable description of a place, keyed by location id (content layer). */
  locationNotes?: Record<string, string>;
}

const OPENERS: Record<ResolutionStatus, string[]> = {
  success: ['It goes as you hoped.', 'Things fall into place.'],
  partial: ['It goes only partly as you hoped.', 'You manage some of it, at a cost.'],
  failure: ['It does not go as you hoped.', 'The attempt comes to nothing.'],
  blocked: ['You cannot do that here.', 'Nothing comes of it; the way is closed.'],
};

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const firstSentence = (text: string) => (text.match(/^.*?[.!?](?:\s|$)/)?.[0] ?? text).trim();

/**
 * A plain-prose account of one resolved turn, built only from the authoritative
 * result (Game Bible section 4: if the model is unavailable the simulation still
 * runs and a safe fallback narrator describes it). Deterministic, no LLM, and it
 * speaks only of what the player perceived, exactly like the narrator digest.
 */
export function fallbackNarration(resolution: ActionResolution, options: FallbackNarratorOptions = {}): string {
  const { state, action, events, status } = resolution;
  const playerId = state.character.id;
  const witnessed = (e: StateEvent) => e.witnesses?.includes(playerId) ?? false;
  const npcName = (id?: string) => state.jianghu?.npcs.find(n => n.id === id)?.name ?? 'Someone';
  const variants = OPENERS[status];
  const parts: string[] = [`${action.description.replace(/[.!?]+$/, '')}. ${variants[state.world.turn % variants.length]}`];

  for (const e of events) {
    if (e.type === 'world.location_changed' && witnessed(e)) {
      const to = str(e.payload.to) ?? state.character.locationId;
      const note = options.locationNotes?.[to];
      const ticks = typeof e.payload.ticks === 'number' ? e.payload.ticks : 0;
      const took = ticks > 1 ? ` After ${describeDuration(ticks).replace(/^about /, '')} on the road${e.payload.delayed === true ? ', slowed by the weather,' : ''} you arrive at ${to}.` : ` You arrive at ${to}.`;
      parts.push(`${took.trim()}${note ? ` ${firstSentence(note)}` : ''}`);
    } else if (e.type === 'world.npc_moved' && witnessed(e) && e.payload.npcId !== playerId) {
      parts.push(e.payload.arriving === true ? `${npcName(str(e.payload.npcId))} arrives.` : `${npcName(str(e.payload.npcId))} sets out for ${str(e.payload.to)}.`);
    } else if (e.type === 'world.fact_discovered' && witnessed(e)) {
      const fact = str(e.payload.fact); const via = str(e.payload.via);
      if (fact?.startsWith('inspected:')) parts.push(`You study ${fact.slice('inspected:'.length)} closely.`);
      else if (fact && via) parts.push(`${npcName(via)} tells you what is being said: ${fact} You cannot yet tell how much of it is true.`);
      else if (fact) parts.push(`You learn something, though you cannot yet be sure of it: ${fact}`);
    } else if (e.type === 'world.finale_resolved' && witnessed(e)) {
      parts.push(`${str(e.payload.headline) ?? ''} ${str(e.payload.description) ?? ''}`.trim());
    } else if (e.type === 'character.combat_resolved') {
      const foe = npcName(str(e.payload.opponentId));
      parts.push(e.payload.outcome === 'won' ? `You bested ${foe}.` : e.payload.outcome === 'drew' ? `You and ${foe} fight to a bloody standstill.` : `${foe} gets the better of you.`);
    } else if (e.type === 'character.defeated') {
      const foe = npcName(str(e.payload.opponentId));
      const out = String(e.payload.outcome);
      parts.push(out === 'mercy' ? `${foe} spares you and lets you go.` : out === 'robbed' ? `${foe} strips you of your belongings and leaves you behind.` : out === 'detained' ? `${foe}'s people seize you and take everything you carry.` : `${foe}'s final blow lands, and you do not rise.`);
    } else if (e.type === 'character.mastery_changed') {
      parts.push(`Your ${str(e.payload.artName)} feels sharper than before.`);
    } else if (e.type === 'character.injury_added') {
      parts.push(`You are hurt: a ${(typeof e.payload.severity === 'number' && e.payload.severity >= 3) ? 'serious' : 'minor'} injury to your ${regionName(str(e.payload.bodyRegion))}.`);
    }
  }

  if (action.kind === 'talk' && action.targetId && (status === 'success' || status === 'partial')
      && !events.some(e => e.type === 'world.fact_discovered' && e.payload.via === action.targetId)) {
    parts.push(`${npcName(action.targetId)} has little new to say; you trade courtesies.`);
  }

  if (status === 'blocked') parts.push(`${resolution.summary} No time passes.`);
  const here = state.character.locationId;
  if (state.world.clock) {
    const env = environmentAt(state, here);
    parts.push(`${describeTime(env.time)}.${env.indoors ? '' : ` ${weatherWord(env.weather).charAt(0).toUpperCase()}${weatherWord(env.weather).slice(1)} outside.`}`);
  }
  const others = (state.jianghu?.npcs ?? []).filter(n => n.alive && n.locationId === here).map(n => n.name);
  if (others.length) parts.push(`Around you in ${here}: ${others.join(', ')}.`);
  return parts.join('\n\n');
}
