import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Character, GameState, GameSettings, GameTurn, LLMConfig, GameChoice } from '../types/game';
import { generateNarrative, generateCharacterIntro, testConnection, LLMResponse } from '../services/llmService';

interface GameStore {
  // Game state
  gameState: GameState;
  settings: GameSettings;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionMessage: string;
  activeTab: 'narrative' | 'character' | 'inventory' | 'quests' | 'settings';
  showCharacterCreation: boolean;
  isDemoMode: boolean;
  
  // Actions
  startNewGame: (character: Character) => Promise<void>;
  makeChoice: (choiceId: number, choiceText: string) => Promise<void>;
  useIntent: (action: string) => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => void;
  testLLMConnection: () => Promise<void>;
  setActiveTab: (tab: GameStore['activeTab']) => void;
  setShowCharacterCreation: (show: boolean) => void;
  clearError: () => void;
  resetGame: () => void;
  loadSavedGame: () => void;
}

const defaultLLMConfig: LLMConfig = {
  provider: 'ollama',
  model: 'llama3',
  baseUrl: 'http://localhost:11434',
  maxTokens: 1000,
  temperature: 0.8,
};

const defaultSettings: GameSettings = {
  llmConfig: defaultLLMConfig,
  theme: 'dark',
  fontSize: 'medium',
  narrativeStyle: 'detailed',
  worldTheme: 'fantasy',
};

const defaultGameState: GameState = {
  character: null,
  turns: [],
  currentScene: '',
  location: 'Unknown',
  questLog: [],
  relationships: [],
  isGameStarted: false,
  isGameOver: false,
  turnCount: 0,
};

// Demo mode narratives
const DEMO_OPENINGS: Array<{ narrative: string; choices: GameChoice[]; location: string }> = [
  {
    narrative: `## The Awakening\n\nYou open your eyes to darkness. Cold stone presses against your back, and the smell of damp earth fills your nostrils. As your vision adjusts, you make out the rough-hewn walls of a dungeon cell.\n\nA flickering torch casts dancing shadows through the iron bars of your cell. Beyond them, a corridor stretches into darkness, but you can hear the distant sound of footsteps and muffled conversation.\n\nOn the ground beside you lies a rusty nail and a scrap of parchment. The lock on your cell door looks old and corroded.`,
    choices: [
      { id: 1, text: 'Examine the rusty nail more closely', risk: 'low' as const },
      { id: 2, text: 'Read the scrap of parchment', risk: 'low' as const },
      { id: 3, text: 'Try to pick the lock with the nail', risk: 'medium' as const },
      { id: 4, text: 'Call out to see if anyone responds', risk: 'high' as const },
      { id: 5, text: 'Wait quietly and listen for more information', risk: 'low' as const },
    ],
    location: 'Dungeon Cell',
  },
  {
    narrative: `## The Crossroads\n\nThe morning mist clings to the ancient crossroads as you stand at the junction of three worn paths. A weathered signpost, half-consumed by ivy, points in three directions.\n\nTo the **north**, the path leads into the Whispering Woods, where travelers speak of strange lights between the trees. To the **east**, a road climbs toward the mountain fortress of Grimhold. To the **south**, smoke rises from what appears to be a small village.\n\nA raven watches you from the signpost, its eyes unnervingly intelligent. At your feet, you notice fresh bootprints in the mud — someone passed through here recently, heading north.`,
    choices: [
      { id: 1, text: 'Follow the bootprints north into the woods', risk: 'medium' as const },
      { id: 2, text: 'Head east toward the mountain fortress', risk: 'low' as const },
      { id: 3, text: 'Go south toward the village for supplies', risk: 'low' as const },
      { id: 4, text: 'Try to communicate with the raven', risk: 'medium' as const },
      { id: 5, text: 'Search the area for anything useful', risk: 'low' as const },
    ],
    location: 'The Crossroads',
  },
];

const DEMO_RESPONSES: Record<string, { narrative: string; choices: GameChoice[]; location?: string }> = {
  'nail': {
    narrative: `You pick up the rusty nail and examine it carefully. Despite its corroded appearance, the point is still sharp enough to be useful. It's about four inches long — perhaps a large roofing nail from the cell door's construction.\n\nAs you turn it in your fingers, you notice something scratched into the metal near the head. Tiny letters, barely visible: **"FREEDOM AWAITS THE BOLD"** — someone was here before you, and they left this as a message.\n\nThe nail could serve as a makeshift tool or weapon in a pinch.`,
    choices: [
      { id: 1, text: 'Pocket the nail and read the parchment', risk: 'low' as const },
      { id: 2, text: 'Try to pick the lock with the nail', risk: 'medium' as const },
      { id: 3, text: 'Examine the cell walls for weak points', risk: 'low' as const },
      { id: 4, text: 'Call out softly to see if anyone is nearby', risk: 'medium' as const },
      { id: 5, text: 'Wait and listen to the approaching footsteps', risk: 'low' as const },
    ],
  },
  'parchment': {
    narrative: `You unfold the crumpled parchment carefully. The handwriting is hasty but legible:\n\n*"To whoever finds this — the guard change happens at the third bell. Only one guard remains. The key hangs on a hook by the east wall. Do NOT trust the one called Marcus. — R.H."*\n\nThe parchment is dated three days ago. Whoever wrote this may still be in the dungeon... or may have escaped. You hear footsteps growing louder in the corridor.`,
    choices: [
      { id: 1, text: 'Memorize the information and hide the parchment', risk: 'low' as const },
      { id: 2, text: 'Prepare to act when the guard change happens', risk: 'medium' as const },
      { id: 3, text: 'Call out to see who is approaching', risk: 'high' as const },
      { id: 4, text: 'Use the nail to try the lock immediately', risk: 'medium' as const },
      { id: 5, text: 'Pretend to be asleep', risk: 'low' as const },
    ],
  },
  'default': {
    narrative: `You take a moment to assess your situation. The dungeon is cold and damp, but you notice that the stonework is old — crumbling in places. Water drips steadily from somewhere above.\n\nThe footsteps in the corridor have paused. You hear a low voice, then the clinking of metal. Someone is nearby, but they haven't noticed you yet.\n\nYour heart beats steadily. Whatever comes next, you'll face it with whatever tools and wit you have.`,
    choices: [
      { id: 1, text: 'Search the cell thoroughly', risk: 'low' as const },
      { id: 2, text: 'Try to make the lock with available materials', risk: 'medium' as const },
      { id: 3, text: 'Prepare an ambush for whoever comes', risk: 'high' as const },
      { id: 4, text: 'Try to find another way out', risk: 'medium' as const },
      { id: 5, text: 'Rest and conserve your strength', risk: 'low' as const },
    ],
  },
};

function getDemoResponse(action: string): LLMResponse {
  const lowerAction = action.toLowerCase();
  
  let response;
  if (lowerAction.includes('nail') || lowerAction.includes('examine')) {
    response = DEMO_RESPONSES['nail'];
  } else if (lowerAction.includes('parchment') || lowerAction.includes('read')) {
    response = DEMO_RESPONSES['parchment'];
  } else {
    response = DEMO_RESPONSES['default'];
  }
  
  return {
    narrative: response.narrative,
    choices: response.choices,
    stateUpdates: {
      experienceGained: 10,
      itemsGained: lowerAction.includes('nail') ? ['Rusty Nail'] : [],
    },
  };
}

function getDemoOpening(): LLMResponse {
  const opening = DEMO_OPENINGS[Math.floor(Math.random() * DEMO_OPENINGS.length)];
  return {
    narrative: opening.narrative,
    choices: opening.choices,
    stateUpdates: {
      locationChange: opening.location,
    },
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: { ...defaultGameState },
      settings: { ...defaultSettings },
      isLoading: false,
      error: null,
      connectionStatus: 'disconnected',
      connectionMessage: '',
      activeTab: 'narrative',
      showCharacterCreation: false,
      isDemoMode: false,
      
      startNewGame: async (character: Character) => {
        const { settings } = get();
        set({ isLoading: true, error: null });
        
        // Check if demo mode
        const isDemo = settings.llmConfig.baseUrl === 'demo' || settings.llmConfig.provider === 'custom' && settings.llmConfig.model === 'demo';
        
        try {
          const state: GameState = {
            character,
            turns: [],
            currentScene: '',
            location: 'The realm awaits...',
            questLog: [],
            relationships: [],
            isGameStarted: true,
            isGameOver: false,
            turnCount: 0,
          };
          
          let response: LLMResponse;
          
          if (isDemo) {
            // Demo mode - use pre-written content
            response = getDemoOpening();
            set({ isDemoMode: true });
          } else {
            response = await generateCharacterIntro(
              settings.llmConfig,
              character,
              settings.worldTheme
            );
          }
          
          const turn: GameTurn = {
            id: uuidv4(),
            narrative: response.narrative,
            choices: response.choices,
            timestamp: Date.now(),
          };
          
          set({
            gameState: {
              ...state,
              turns: [turn],
              currentScene: response.narrative,
              location: response.stateUpdates?.locationChange || state.location,
              turnCount: 1,
            },
            isLoading: false,
            activeTab: 'narrative',
          });
        } catch (error) {
          // Fall back to demo mode on error
          const response = getDemoOpening();
          const turn: GameTurn = {
            id: uuidv4(),
            narrative: response.narrative,
            choices: response.choices,
            timestamp: Date.now(),
          };
          
          set({ 
            isLoading: false,
            isDemoMode: true,
            error: `Could not connect to AI. Running in demo mode. Configure your LLM in Settings for full AI narration.`,
            gameState: {
              character,
              isGameStarted: true,
              turns: [turn],
              currentScene: response.narrative,
              location: response.stateUpdates?.locationChange || 'Dungeon Cell',
              turnCount: 1,
              questLog: [],
              relationships: [],
              isGameOver: false,
            },
          });
        }
      },
      
      makeChoice: async (choiceId: number, choiceText: string) => {
        const { gameState, settings, isDemoMode } = get();
        set({ isLoading: true, error: null });
        
        try {
          let response: LLMResponse;
          
          if (isDemoMode) {
            response = getDemoResponse(choiceText);
          } else {
            response = await generateNarrative(
              settings.llmConfig,
              gameState,
              `[Chose option ${choiceId}]: ${choiceText}`
            );
          }
          
          const turn: GameTurn = {
            id: uuidv4(),
            narrative: response.narrative,
            choices: response.choices,
            playerAction: choiceText,
            timestamp: Date.now(),
          };
          
          const updatedCharacter = applyStateUpdates(gameState.character!, response.stateUpdates);
          
          set({
            gameState: {
              ...gameState,
              character: updatedCharacter,
              turns: [...gameState.turns, turn],
              currentScene: response.narrative,
              location: response.stateUpdates?.locationChange || gameState.location,
              turnCount: gameState.turnCount + 1,
            },
            isLoading: false,
          });
        } catch (error) {
          // Fall back to demo
          const response = getDemoResponse(choiceText);
          const turn: GameTurn = {
            id: uuidv4(),
            narrative: response.narrative,
            choices: response.choices,
            playerAction: choiceText,
            timestamp: Date.now(),
          };
          
          const updatedCharacter = applyStateUpdates(gameState.character!, response.stateUpdates);
          
          set({
            isLoading: false,
            isDemoMode: true,
            gameState: {
              ...gameState,
              character: updatedCharacter,
              turns: [...gameState.turns, turn],
              currentScene: response.narrative,
              turnCount: gameState.turnCount + 1,
            },
          });
        }
      },
      
      useIntent: async (action: string) => {
        const { gameState, settings, isDemoMode } = get();
        set({ isLoading: true, error: null });
        
        try {
          let response: LLMResponse;
          
          if (isDemoMode) {
            response = getDemoResponse(action);
          } else {
            response = await generateNarrative(
              settings.llmConfig,
              gameState,
              `[Intent]: ${action}`
            );
          }
          
          const turn: GameTurn = {
            id: uuidv4(),
            narrative: response.narrative,
            choices: response.choices,
            playerAction: action,
            timestamp: Date.now(),
            isIntent: true,
          };
          
          const updatedCharacter = applyStateUpdates(gameState.character!, response.stateUpdates);
          
          set({
            gameState: {
              ...gameState,
              character: updatedCharacter,
              turns: [...gameState.turns, turn],
              currentScene: response.narrative,
              location: response.stateUpdates?.locationChange || gameState.location,
              turnCount: gameState.turnCount + 1,
            },
            isLoading: false,
          });
        } catch (error) {
          const response = getDemoResponse(action);
          const turn: GameTurn = {
            id: uuidv4(),
            narrative: response.narrative,
            choices: response.choices,
            playerAction: action,
            timestamp: Date.now(),
            isIntent: true,
          };
          
          const updatedCharacter = applyStateUpdates(gameState.character!, response.stateUpdates);
          
          set({
            isLoading: false,
            isDemoMode: true,
            gameState: {
              ...gameState,
              character: updatedCharacter,
              turns: [...gameState.turns, turn],
              currentScene: response.narrative,
              turnCount: gameState.turnCount + 1,
            },
          });
        }
      },
      
      updateSettings: (newSettings: Partial<GameSettings>) => {
        set({ settings: { ...get().settings, ...newSettings } });
      },
      
      testLLMConnection: async () => {
        const { settings } = get();
        set({ connectionStatus: 'connecting', connectionMessage: 'Testing connection...' });
        
        const result = await testConnection(settings.llmConfig);
        
        set({
          connectionStatus: result.success ? 'connected' : 'error',
          connectionMessage: result.message,
        });
      },
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      setShowCharacterCreation: (show) => set({ showCharacterCreation: show }),
      clearError: () => set({ error: null }),
      
      resetGame: () => {
        set({
          gameState: { ...defaultGameState },
          activeTab: 'narrative',
          showCharacterCreation: false,
          isDemoMode: false,
        });
      },
      
      loadSavedGame: () => {
        set({ activeTab: 'narrative' });
      },
    }),
    {
      name: 'rpg-game-storage',
      partialize: (state) => ({
        gameState: state.gameState,
        settings: state.settings,
      }),
    }
  )
);

function applyStateUpdates(character: Character, updates?: any): Character {
  if (!updates) return character;
  
  let newCharacter = { ...character };
  newCharacter.stats = { ...character.stats };
  newCharacter.inventory = [...character.inventory];
  newCharacter.skills = [...character.skills];
  
  if (updates.hpChange) {
    newCharacter.stats.currentHp = Math.max(0, Math.min(
      newCharacter.stats.maxHp,
      newCharacter.stats.currentHp + updates.hpChange
    ));
  }
  
  if (updates.manaChange) {
    newCharacter.stats.currentMana = Math.max(0, Math.min(
      newCharacter.stats.maxMana,
      newCharacter.stats.currentMana + updates.manaChange
    ));
  }
  
  if (updates.experienceGained) {
    newCharacter.experience += updates.experienceGained;
    const xpNeeded = newCharacter.level * 100;
    if (newCharacter.experience >= xpNeeded) {
      newCharacter.level += 1;
      newCharacter.experience -= xpNeeded;
      newCharacter.stats.maxHp += 5;
      newCharacter.stats.currentHp = newCharacter.stats.maxHp;
      newCharacter.stats.maxMana += 3;
      newCharacter.stats.currentMana = newCharacter.stats.maxMana;
    }
  }
  
  if (updates.goldChange) {
    newCharacter.gold = Math.max(0, newCharacter.gold + updates.goldChange);
  }
  
  if (updates.itemsGained) {
    updates.itemsGained.forEach((itemName: string) => {
      const existing = newCharacter.inventory.find(i => i.name === itemName);
      if (existing) {
        existing.quantity += 1;
      } else {
        newCharacter.inventory.push({
          id: uuidv4(),
          name: itemName,
          type: 'misc',
          description: `A ${itemName}`,
          quantity: 1,
          value: 10,
        });
      }
    });
  }
  
  if (updates.itemsLost) {
    updates.itemsLost.forEach((itemName: string) => {
      const idx = newCharacter.inventory.findIndex(i => i.name === itemName);
      if (idx !== -1) {
        newCharacter.inventory[idx].quantity -= 1;
        if (newCharacter.inventory[idx].quantity <= 0) {
          newCharacter.inventory.splice(idx, 1);
        }
      }
    });
  }
  
  if (updates.skillsGained) {
    updates.skillsGained.forEach((skill: string) => {
      if (!newCharacter.skills.includes(skill)) {
        newCharacter.skills.push(skill);
      }
    });
  }
  
  return newCharacter;
}
