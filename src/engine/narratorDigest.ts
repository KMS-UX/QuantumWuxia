import type { ActionResolution, StateEvent } from './types';

export interface NarratorDigestOptions {
  /** How an NPC speaks, keyed by NPC id (presentation data from the content layer). */
  npcVoices?: Record<string, string>;
  /** Observable description of a place (summary, features), keyed by location id. */
  locationNotes?: Record<string, string>;
}

const STATUS_TEXT: Record<ActionResolution['status'], string> = {
  success: 'SUCCESS: the player achieved what they set out to do.',
  partial: 'PARTIAL SUCCESS: the player achieved part of their aim, with a complication or cost.',
  failure: 'FAILURE: the player did not achieve their aim.',
  blocked: 'BLOCKED: the action could not be attempted.',
};

const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * Build the narrator's briefing for one resolved turn.
 *
 * The digest is a *player-perception filter* over the deterministic result: it
 * lists only what the player did, saw, heard, or felt this turn, and who and what
 * is observably present. NPC secrets, goals, fears, offscreen NPC actions, faction
 * bookkeeping and hidden truth values are never included, so the narrator cannot
 * leak them. Pure and deterministic.
 */
export function buildNarratorDigest(resolution: ActionResolution, options: NarratorDigestOptions = {}): string {
  const { state, action, events } = resolution;
  const playerId = state.character.id;
  const here = state.character.locationId;
  const jianghu = state.jianghu;
  const npcName = (id: string | undefined) => jianghu?.npcs.find(n => n.id === id)?.name ?? id ?? 'someone';
  const witnessed = (e: StateEvent) => e.witnesses?.includes(playerId) ?? false;

  const lines: string[] = [];
  lines.push(`Action: ${action.description} (${action.kind})`);
  lines.push(`Outcome: ${STATUS_TEXT[resolution.status]}`);

  // What the player perceived because of their own action.
  const happened: string[] = [];
  for (const e of events) {
    switch (e.type) {
      case 'world.location_changed':
        if (witnessed(e)) happened.push(`You travelled from ${str(e.payload.from)} to ${str(e.payload.to)}.`);
        break;
      case 'world.fact_discovered': {
        if (!witnessed(e)) break;
        const fact = str(e.payload.fact);
        const via = str(e.payload.via);
        if (fact?.startsWith('inspected:')) {
          happened.push(`You examined ${fact.slice('inspected:'.length)} closely.`);
        } else if (fact && via) {
          happened.push(`${npcName(via)} told you this, as hearsay you cannot yet verify (credibility about ${num(e.payload.confidence) ?? '?'}/100): "${fact}"`);
        } else if (fact) {
          happened.push(`You learned (unverified): "${fact}"`);
        }
        break;
      }
      case 'character.social_changed':
        if (witnessed(e) && action.kind === 'talk') happened.push(`The conversation went well; ${npcName(action.targetId)} warmed to you slightly.`);
        break;
      case 'character.injury_added':
        happened.push(`You suffered a minor ${str(e.payload.bodyRegion) ?? 'physical'} injury.`);
        break;
      case 'character.hp_changed':
        if ((num(e.payload.amount) ?? 0) < 0) happened.push(`You lost ${Math.abs(num(e.payload.amount) ?? 0)} HP.`);
        break;
      default:
        break;
    }
  }
  if (action.kind === 'talk' && action.targetId && (resolution.status === 'success' || resolution.status === 'partial')
      && !events.some(e => e.type === 'world.fact_discovered' && e.payload.via === action.targetId)) {
    happened.push(`${npcName(action.targetId)} has nothing new to tell you right now; keep the exchange to courtesy and atmosphere.`);
  }
  if (state.character.fatigue >= 70) happened.push('You are visibly weary.');
  lines.push('', 'What the player perceived this turn:');
  lines.push(...(happened.length ? happened.map(h => `- ${h}`) : ['- Nothing notable beyond the attempt itself.']));

  // Observable surroundings.
  lines.push('', `Current location: ${here}`);
  const note = options.locationNotes?.[here];
  if (note) lines.push(note);

  if (jianghu) {
    const present = jianghu.npcs.filter(n => n.alive && n.locationId === here);
    lines.push('', 'People visibly present:');
    lines.push(...(present.length ? present.map(n => `- ${n.name} (${n.role})`) : ['- No one of note.']));

    const target = action.targetId ? jianghu.npcs.find(n => n.id === action.targetId) : undefined;
    const voice = target ? options.npcVoices?.[target.id] : undefined;
    if (target && voice) lines.push('', `How ${target.name} speaks: ${voice}`);

    const advanced = new Map<string, number>();
    for (const e of events) {
      if (e.type === 'world.causal_chain_advanced') advanced.set(str(e.payload.rootEventId) ?? '', num(e.payload.step) ?? 0);
    }
    const conditions = jianghu.worldEvents.filter(w => w.active && w.locationId === here);
    if (conditions.length) {
      lines.push('', 'Public situation here (visible to anyone present):');
      for (const w of conditions) {
        const step = advanced.get(w.id);
        lines.push(`- ${w.title}: ${w.description}${step ? ` Tension is building (stage ${step}).` : ''}`);
      }
    }
  }

  lines.push(
    '',
    'Narration rules for this turn:',
    '- Narrate only the facts above. Do not invent named people, places, factions or items that are not listed.',
    '- Do not reveal any NPC\'s secrets, private goals or offscreen activity; the player does not know them.',
    '- Do not move the player or change any numbers; the simulation has already decided the outcome.',
  );
  return lines.join('\n');
}
