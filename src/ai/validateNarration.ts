/**
 * Runtime validation for narrator (LLM) output. Pure functions, no network and no
 * game-state access, so the AI boundary can be tested exhaustively.
 *
 * Contract (Game Bible: the narrator describes, the simulation decides):
 * - the narrator may supply prose and a list of suggested choices;
 * - it may NOT change any game state, so every `stateUpdates` field is dropped
 *   except an optional, validated `locationChange` (legacy opening scenes only).
 */

export type Risk = 'low' | 'medium' | 'high';
export interface NarrationChoice { id: number; text: string; risk: Risk }
export interface NarrationResult {
  narrative: string;
  choices: NarrationChoice[];
  stateUpdates: { locationChange?: string };
}
export interface NarrationValidation {
  result: NarrationResult;
  /** Human-readable problems found and repaired; empty when the output was clean. */
  issues: string[];
  /** True when no usable narrative could be recovered and a stock line was substituted. */
  narrativeIsFallback: boolean;
}
export interface ValidateOptions {
  /** When provided, a `locationChange` outside this list is dropped. */
  allowedLocationIds?: string[];
}

export const MAX_NARRATIVE_CHARS = 4000;
export const MAX_CHOICE_CHARS = 160;
export const CHOICE_COUNT = 5;
export const NARRATIVE_FALLBACK = 'The moment passes in uneasy quiet. (The storyteller lost the thread; choose again.)';

const FALLBACK_CHOICES: Array<Omit<NarrationChoice, 'id'>> = [
  { text: 'Look around carefully', risk: 'low' },
  { text: 'Proceed forward cautiously', risk: 'medium' },
  { text: 'Search for hidden paths', risk: 'low' },
  { text: 'Call out to see if anyone is nearby', risk: 'medium' },
  { text: 'Prepare for potential danger', risk: 'high' },
];

/** Collect every balanced top-level `{...}` span, respecting JSON strings and escapes. */
export function balancedObjects(text: string): string[] {
  const found: string[] = [];
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0; let inString = false; let escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) { found.push(text.slice(start, i + 1)); break; }
    }
  }
  return found;
}

/** Find the first object in `raw` that parses as JSON and carries a `narrative` field. */
export function extractNarrationJson(raw: string): Record<string, unknown> | undefined {
  const cleaned = raw.replace(/```(?:json)?/gi, '');
  for (const candidate of balancedObjects(cleaned)) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'narrative' in parsed) {
        return parsed as Record<string, unknown>;
      }
    } catch { /* try the next candidate */ }
  }
  return undefined;
}

/** Recover the narrative from truncated or malformed JSON by reading the string value directly. */
function salvageNarrative(raw: string): string | undefined {
  const m = raw.match(/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return undefined;
  try { return JSON.parse(`"${m[1].replace(/\\$/, '')}"`) as string; } catch { return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'); }
}

function capNarrative(text: string, issues: string[]): string {
  if (text.length <= MAX_NARRATIVE_CHARS) return text;
  issues.push(`narrative truncated from ${text.length} chars`);
  const cut = text.slice(0, MAX_NARRATIVE_CHARS);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'), cut.lastIndexOf('。'));
  return (lastStop > MAX_NARRATIVE_CHARS * 0.6 ? cut.slice(0, lastStop + 1) : cut).trimEnd();
}

function normaliseRisk(value: unknown, issues: string[]): Risk {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  if (v === 'med' || v === 'moderate') return 'medium';
  issues.push(`invalid risk ${JSON.stringify(value)} replaced with "medium"`);
  return 'medium';
}

function normaliseChoices(value: unknown, issues: string[]): NarrationChoice[] {
  const out: NarrationChoice[] = [];
  const seen = new Set<string>();
  if (value !== undefined && !Array.isArray(value)) issues.push('choices is not an array');
  const items = Array.isArray(value) ? value : [];
  for (const item of items) {
    const rawText = typeof item === 'string' ? item : (item && typeof item === 'object' ? (item as Record<string, unknown>).text : undefined);
    if (typeof rawText !== 'string') { issues.push('choice without text dropped'); continue; }
    let text = rawText.replace(/\s+/g, ' ').trim();
    if (!text) { issues.push('empty choice dropped'); continue; }
    if (text.length > MAX_CHOICE_CHARS) { text = `${text.slice(0, MAX_CHOICE_CHARS - 1).trimEnd()}…`; issues.push('overlong choice shortened'); }
    const key = text.toLowerCase();
    if (seen.has(key)) { issues.push(`duplicate choice dropped: ${text}`); continue; }
    seen.add(key);
    const risk = typeof item === 'object' && item ? normaliseRisk((item as Record<string, unknown>).risk, issues) : 'medium';
    out.push({ id: 0, text, risk });
  }
  if (out.length > CHOICE_COUNT) { issues.push(`${out.length} choices supplied; kept first ${CHOICE_COUNT}`); out.length = CHOICE_COUNT; }
  if (out.length < CHOICE_COUNT) {
    issues.push(`only ${out.length} valid choices; padded to ${CHOICE_COUNT}`);
    for (const fallback of FALLBACK_CHOICES) {
      if (out.length >= CHOICE_COUNT) break;
      if (!seen.has(fallback.text.toLowerCase())) { seen.add(fallback.text.toLowerCase()); out.push({ id: 0, ...fallback }); }
    }
  }
  return out.map((c, i) => ({ ...c, id: i + 1 }));
}

export function validateNarration(parsed: Record<string, unknown> | undefined, raw: string, options: ValidateOptions = {}): NarrationValidation {
  const issues: string[] = [];
  let narrative: string | undefined;
  let narrativeIsFallback = false;

  if (parsed && typeof parsed.narrative === 'string' && parsed.narrative.trim()) {
    narrative = parsed.narrative.trim();
  } else {
    if (parsed) issues.push('narrative missing or not a string');
    narrative = parsed ? undefined : salvageNarrative(raw)?.trim();
    if (!narrative && !raw.includes('{') && raw.trim()) narrative = raw.trim(); // plain prose reply
    if (narrative) issues.push(parsed ? 'recovered narrative from raw text' : 'response was not valid JSON; narrative recovered');
  }
  if (!narrative) { narrative = NARRATIVE_FALLBACK; narrativeIsFallback = true; issues.push('no usable narrative; stock line substituted'); }

  const stateUpdates: NarrationResult['stateUpdates'] = {};
  const updates = parsed?.stateUpdates;
  if (updates && typeof updates === 'object') {
    const dropped = Object.keys(updates).filter(k => k !== 'locationChange');
    if (dropped.length) issues.push(`state updates ignored (the simulation owns state): ${dropped.join(', ')}`);
    const loc = (updates as Record<string, unknown>).locationChange;
    if (typeof loc === 'string' && loc.trim() && loc.trim().length <= 80) {
      if (!options.allowedLocationIds || options.allowedLocationIds.includes(loc.trim())) stateUpdates.locationChange = loc.trim();
      else issues.push(`locationChange "${loc.trim()}" is not a known location; ignored`);
    } else if (loc !== undefined) issues.push('invalid locationChange ignored');
  }

  return {
    result: { narrative: capNarrative(narrative, issues), choices: normaliseChoices(parsed?.choices, issues), stateUpdates },
    issues,
    narrativeIsFallback,
  };
}

/** Full pipeline: raw model text in, repaired narration out. */
export function parseNarration(raw: string, options: ValidateOptions = {}): NarrationValidation {
  return validateNarration(extractNarrationJson(raw), raw, options);
}
