import { LLMConfig, GameTurn, Character, GameState, GameChoice } from '../types/game';

export interface LLMResponse {
  narrative: string;
  choices: GameChoice[];
  stateUpdates?: {
    itemsGained?: string[];
    itemsLost?: string[];
    skillsGained?: string[];
    hpChange?: number;
    manaChange?: number;
    experienceGained?: number;
    goldChange?: number;
    newRelationship?: { name: string; type: string; disposition: number };
    locationChange?: string;
  };
}

const SYSTEM_PROMPT = `You are the narrative layer of QuantumWuxia, a persistent Wuxia-fantasy RPG simulation. You are not the game engine and you must never invent authoritative state changes. Your role:
- Describe scenes vividly but concisely (2-4 paragraphs)
- Present exactly 5 numbered choices for the player, each with a risk level
- Treat the supplied simulation state and resolution as authoritative
- Remember previous events and characters
- Treat Qi as internal energy rather than generic mana
- Respect martial arts, cultivation, fatigue, injury, reputation, and consequence-driven Wuxia logic
- Make consequences feel real and meaningful
- Never decide whether an action succeeds; the simulation resolver has already decided that
- Never invent items, damage, rewards, travel, relationships, or other state changes
- Include sensory details and atmosphere
- Never break character as the narrator

Always respond in valid JSON format with this structure:
{
  "narrative": "The scene description...",
  "choices": [
    {"id": 1, "text": "Choice text", "risk": "low"},
    {"id": 2, "text": "Choice text", "risk": "medium"},
    {"id": 3, "text": "Choice text", "risk": "high"},
    {"id": 4, "text": "Choice text", "risk": "low"},
    {"id": 5, "text": "Choice text", "risk": "medium"}
  ],
  "stateUpdates": {}
}

}`;

function buildContextPrompt(state: GameState, playerAction: string): string {
  const { character, turns, location, questLog, relationships } = state;
  
  let context = `## Current Game State\n\n`;
  
  if (character) {
    context += `### Character\n`;
    context += `- Name: ${character.name}\n`;
    if (character.originId) {
      // Wuxia origin: no race/level/gold bookkeeping; mana is Qi here.
      context += `- Origin: ${character.class}\n`;
      context += `- HP: ${character.stats.currentHp}/${character.stats.maxHp}\n`;
      context += `- Qi: ${character.stats.currentMana}/${character.stats.maxMana}\n`;
    } else {
    context += `- Class: ${character.class}\n`;
    context += `- Race: ${character.race}\n`;
    context += `- Level: ${character.level}\n`;
    context += `- HP: ${character.stats.currentHp}/${character.stats.maxHp}\n`;
    context += `- Mana: ${character.stats.currentMana}/${character.stats.maxMana}\n`;
    context += `- Gold: ${character.gold}\n`;
    }
    context += `- Stats: STR ${character.stats.strength}, AGI ${character.stats.agility}, INT ${character.stats.intelligence}, CHA ${character.stats.charisma}, LCK ${character.stats.luck}\n`;
    context += `- Skills: ${character.skills.join(', ') || 'None'}\n`;
    context += `- Inventory: ${character.inventory.map(i => `${i.name} x${i.quantity}`).join(', ') || 'Empty'}\n\n`;
  }
  
  context += `### Location\n${location}\n\n`;
  
  if (questLog.length > 0) {
    context += `### Active Quests\n`;
    questLog.filter(q => q.status === 'active').forEach(q => {
      context += `- ${q.title}: ${q.description}\n`;
    });
    context += '\n';
  }
  
  if (relationships.length > 0) {
    context += `### Known Characters\n`;
    relationships.forEach(r => {
      context += `- ${r.name} (${r.type}, disposition: ${r.disposition}): ${r.notes}\n`;
    });
    context += '\n';
  }
  
  if (state.simulation) {
    const simulation = state.simulation;
    context += `### Authoritative Simulation\n`;
    context += `- Simulation turn: ${simulation.world.turn}\n`;
    context += `- Current location id: ${simulation.character.locationId}\n`;
    context += `- HP: ${simulation.character.hp}/${simulation.character.maxHp}\n`;
    context += `- Qi: ${simulation.character.qi}/${simulation.character.maxQi}\n`;
    context += `- Fatigue: ${simulation.character.fatigue}/100\n`;
    context += `- Conditions: ${simulation.character.conditions.map(c => c.id).join(', ') || 'None'}\n`;
    context += `- Known facts: ${simulation.world.knownFacts.join(', ') || 'None'}\n\n`;    if (simulation.character.wuxia) {
      const wuxia = simulation.character.wuxia;
      context += `- Cultivation: ${wuxia.cultivation.stage}, Qi control ${wuxia.cultivation.qiControl}/100, meridian integrity ${wuxia.cultivation.meridianIntegrity}/100\n`;
      context += `- Martial arts: ${wuxia.martialArts.map(art => `${art.name} (mastery ${art.mastery})`).join(', ') || 'None'}\n`;
      context += `- Injuries: ${wuxia.injuries.map(injury => `${injury.id} severity ${injury.severity}`).join(', ') || 'None'}\n`;
      context += `- Social: reputation ${wuxia.social.reputation}, Face ${wuxia.social.face}, trust ${wuxia.social.trust}, fear ${wuxia.social.fear}\n`;
    }

  }

  // Recent history (last 5 turns)
  const recentTurns = turns.slice(-5);
  if (recentTurns.length > 0) {
    context += `### Recent Events\n`;
    recentTurns.forEach((turn, i) => {
      context += `Turn ${turns.length - recentTurns.length + i + 1}: ${turn.narrative.substring(0, 200)}...\n`;
      if (turn.playerAction) {
        context += `  Player: ${turn.playerAction}\n`;
      }
    });
    context += '\n';
  }
  
  context += `### Player Action\n${playerAction}\n\n`;
  context += `Now narrate what happens next. Remember to provide exactly 5 choices and respond in valid JSON format.`;
  
  return context;
}

async function callOpenAI(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOllama(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.message.content;
}

async function callLMStudio(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  // LM Studio uses OpenAI-compatible API
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LM Studio API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callCustomEndpoint(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Custom API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  // Try to handle various response formats
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (data.message?.content) {
    return data.message.content;
  }
  if (data.response) {
    return data.response;
  }
  if (data.text) {
    return data.text;
  }
  return JSON.stringify(data);
}

function parseLLMResponse(raw: string): LLMResponse {
  // Try to extract JSON from the response
  let jsonStr = raw;
  
  // Try to find JSON block
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      narrative: parsed.narrative || 'The story continues...',
      choices: parsed.choices || generateFallbackChoices(),
      stateUpdates: parsed.stateUpdates || {},
    };
  } catch {
    // If JSON parsing fails, treat the whole response as narrative
    return {
      narrative: raw.substring(0, 500),
      choices: generateFallbackChoices(),
      stateUpdates: {},
    };
  }
}

function generateFallbackChoices(): GameChoice[] {
  return [
    { id: 1, text: 'Look around carefully', risk: 'low' },
    { id: 2, text: 'Proceed forward cautiously', risk: 'medium' },
    { id: 3, text: 'Search for hidden paths', risk: 'low' },
    { id: 4, text: 'Call out to see if anyone is nearby', risk: 'medium' },
    { id: 5, text: 'Prepare for potential danger', risk: 'high' },
  ];
}

export async function generateNarrative(
  config: LLMConfig,
  state: GameState,
  playerAction: string
): Promise<LLMResponse> {
  const contextPrompt = buildContextPrompt(state, playerAction);
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: contextPrompt },
  ];

  let rawResponse: string;

  switch (config.provider) {
    case 'openai':
      rawResponse = await callOpenAI(config, messages);
      break;
    case 'ollama':
      rawResponse = await callOllama(config, messages);
      break;
    case 'lmstudio':
      rawResponse = await callLMStudio(config, messages);
      break;
    case 'custom':
      rawResponse = await callCustomEndpoint(config, messages);
      break;
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  return parseLLMResponse(rawResponse);
}

export async function generateCharacterIntro(
  config: LLMConfig,
  character: Character,
  worldTheme: string,
  scenario?: string
): Promise<LLMResponse> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { 
      role: 'user', 
      content: `Begin a new adventure for this character in a ${worldTheme} setting:
      
Character: ${character.name}, a level 1 ${character.race} ${character.class}.
Background: ${character.background}
Stats: STR ${character.stats.strength}, AGI ${character.stats.agility}, INT ${character.stats.intelligence}, CHA ${character.stats.charisma}, LCK ${character.stats.luck}
Starting equipment: ${character.inventory.map(i => i.name).join(', ') || 'Nothing'}
${scenario ? `\nAuthored starting scenario (do not contradict it, do not change the location, do not invent new named factions or people; the player's five choices are supplied separately, so "choices" may be an empty array):\n${scenario}\n` : ''}
Create an engaging opening scene that introduces the character to the world. Set the mood, describe the surroundings, and present an initial situation that the character must respond to. Respond in valid JSON format.` 
    },
  ];

  let rawResponse: string;

  switch (config.provider) {
    case 'openai':
      rawResponse = await callOpenAI(config, messages);
      break;
    case 'ollama':
      rawResponse = await callOllama(config, messages);
      break;
    case 'lmstudio':
      rawResponse = await callLMStudio(config, messages);
      break;
    case 'custom':
      rawResponse = await callCustomEndpoint(config, messages);
      break;
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  return parseLLMResponse(rawResponse);
}

export async function testConnection(config: LLMConfig): Promise<{ success: boolean; message: string }> {
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Reply with just "Connection successful!" and nothing else.' },
    ];

    let response: string;
    switch (config.provider) {
      case 'openai':
        response = await callOpenAI(config, messages);
        break;
      case 'ollama':
        response = await callOllama(config, messages);
        break;
      case 'lmstudio':
        response = await callLMStudio(config, messages);
        break;
      case 'custom':
        response = await callCustomEndpoint(config, messages);
        break;
      default:
        return { success: false, message: 'Unknown provider' };
    }

    return { success: true, message: `Connected successfully! Response: "${response.substring(0, 100)}"` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${(error as Error).message}` };
  }
}
