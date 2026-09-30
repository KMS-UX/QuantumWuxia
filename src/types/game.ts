export interface CharacterStats {
  strength: number;
  agility: number;
  intelligence: number;
  charisma: number;
  luck: number;
  maxHp: number;
  currentHp: number;
  maxMana: number;
  currentMana: number;
}

export interface Character {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  experience: number;
  stats: CharacterStats;
  skills: string[];
  inventory: InventoryItem[];
  gold: number;
  background: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'quest' | 'misc';
  description: string;
  quantity: number;
  value: number;
}

export interface GameChoice {
  id: number;
  text: string;
  risk: 'low' | 'medium' | 'high';
}

export interface GameTurn {
  id: string;
  narrative: string;
  choices: GameChoice[];
  playerAction?: string;
  timestamp: number;
  isIntent?: boolean;
}

export interface GameState {
  character: Character | null;
  turns: GameTurn[];
  currentScene: string;
  location: string;
  questLog: QuestEntry[];
  relationships: Relationship[];
  isGameStarted: boolean;
  isGameOver: boolean;
  turnCount: number;
}

export interface QuestEntry {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
}

export interface Relationship {
  id: string;
  name: string;
  type: 'ally' | 'enemy' | 'neutral' | 'merchant' | 'mentor';
  disposition: number; // -100 to 100
  notes: string;
}

export interface LLMConfig {
  provider: 'openai' | 'ollama' | 'lmstudio' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

export interface GameSettings {
  llmConfig: LLMConfig;
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
  narrativeStyle: 'detailed' | 'concise' | 'dramatic';
  worldTheme: 'fantasy' | 'sci-fi' | 'horror' | 'wuxia' | 'custom';
}
