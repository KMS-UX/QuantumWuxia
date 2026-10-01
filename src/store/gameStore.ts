import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Character, GameState, GameSettings, GameTurn, LLMConfig, GameChoice, SaveSlot, Achievement } from '../types/game';
import { generateNarrative, generateCharacterIntro, testConnection, LLMResponse } from '../services/llmService';
import { DEFAULT_ACHIEVEMENTS } from '../components/Achievements';
import { JournalEntry } from '../components/Journal';
import { database } from '../services/database';
import { changeTracker } from '../services/changeTracker';
import { soundManager } from '../services/soundManager';
import { resolvePlayerAction } from '../engine/actionPipeline';
import { createSimulationState } from '../engine/simulationAdapter';

interface GameStore {
  // Game state
  gameState: GameState;
  settings: GameSettings;
  saveSlots: SaveSlot[];
  achievements: Achievement[];
  journalEntries: JournalEntry[];
  visitedLocations: string[];
  isDead: boolean;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionMessage: string;
  activeTab: 'narrative' | 'character' | 'inventory' | 'quests' | 'settings';
  showCharacterCreation: boolean;
  isDemoMode: boolean;
  sessionStartTime: number;
  lastAutoSave: number | null;
  isAutoSaving: boolean;
  tutorialCompleted: boolean;
  
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
  saveGame: (name: string) => void;
  loadGame: (slotId: string) => void;
  deleteSave: (slotId: string) => void;
  checkAchievements: () => void;
  autoSave: () => void;
  completeTutorial: () => void;
  addJournalEntry: (title: string, content: string) => void;
  deleteJournalEntry: (id: string) => void;
  addVisitedLocation: (location: string) => void;
  setDead: (dead: boolean) => void;
  revive: () => void;
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
  worldTheme: 'wuxia',
  soundEnabled: true,
  animationsEnabled: true,
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
      saveSlots: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      journalEntries: [],
      visitedLocations: [],
      isDead: false,
      isLoading: false,
      error: null,
      connectionStatus: 'disconnected',
      connectionMessage: '',
      activeTab: 'narrative',
      showCharacterCreation: false,
      isDemoMode: false,
      sessionStartTime: Date.now(),
      lastAutoSave: null,
      isAutoSaving: false,
      tutorialCompleted: false,
      
      startNewGame: async (character: Character) => {
        const { settings } = get();
        set({ isLoading: true, error: null });
        
        // Initialize database
        try {
          await database.init();
        } catch (error) {
          console.error('Database initialization failed:', error);
        }
        
        // Check if demo mode
        const isDemo = settings.llmConfig.baseUrl === 'demo' || settings.llmConfig.provider === 'custom' && settings.llmConfig.model === 'demo';
        
        try {
          const gameId = uuidv4();
          changeTracker.setGameId(gameId);
          
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
          
          // Save initial state to database
          await database.saveGameState(gameId, state, settings);
          await database.setMetadata('currentGameId', gameId);
          await database.setMetadata('sessionStartTime', Date.now());
          
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
            gameState: (() => {
              const initialState: GameState = {
                ...state,
                turns: [turn],
                currentScene: response.narrative,
                location: response.stateUpdates?.locationChange || state.location,
                turnCount: 1,
              };
              return {
                ...initialState,
                simulation: createSimulationState(initialState, [initialState.location]),
              };
            })(),
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
            gameState: (() => {
              const initialState: GameState = {
                character,
                isGameStarted: true,
                turns: [turn],
                currentScene: response.narrative,
                location: response.stateUpdates?.locationChange || 'Dungeon Cell',
                turnCount: 1,
                questLog: [],
                relationships: [],
                isGameOver: false,
              };
              return {
                ...initialState,
                simulation: createSimulationState(initialState, [initialState.location]),
              };
            })(),
          });
        }
      },
      
      makeChoice: async (choiceId: number, choiceText: string) => {
        const { gameState, settings, isDemoMode } = get();
        soundManager.choiceConfirm();
        set({ isLoading: true, error: null });

        try {
          const selectedChoice = gameState.turns[gameState.turns.length - 1]?.choices.find(c => c.id === choiceId);
          const prepared = resolvePlayerAction(gameState, choiceText, selectedChoice?.risk ?? 'medium');
          const resolvedState = prepared.nextGameState;
          const resolutionContext = `[Resolved action: ${prepared.resolution.status}] ${prepared.resolution.summary}`;

          let response: LLMResponse;
          if (isDemoMode) {
            response = getDemoResponse(choiceText);
          } else {
            response = await generateNarrative(
              settings.llmConfig,
              resolvedState,
              `[Chose option ${choiceId}]: ${choiceText}\n${resolutionContext}`
            );
          }

          const turn: GameTurn = {
            id: uuidv4(),
            narrative: response.narrative,
            choices: response.choices,
            playerAction: choiceText,
            timestamp: Date.now(),
          };

          const newState: GameState = {
            ...resolvedState,
            turns: [...resolvedState.turns, turn],
            currentScene: response.narrative,
          };

          set({
            gameState: newState,
            isLoading: false,
          });

          try {
            await changeTracker.trackStateChange(gameState, newState, newState.turnCount);
            await changeTracker.trackPlayerAction(choiceText, false, newState.turnCount);
            await database.logVisitedLocation(changeTracker['gameId'], newState.location, newState.turnCount);
          } catch (error) {
            console.error('Failed to track changes:', error);
          }

          get().addVisitedLocation(newState.location);
          if (newState.character?.stats.currentHp <= 0) {
            get().setDead(true);
          }
          setTimeout(() => get().checkAchievements(), 100);
        } catch (error) {
          console.error('Player choice resolution failed:', error);
          set({
            isLoading: false,
            error: (error as Error).message,
          });
        }
      },

      useIntent: async (action: string) => {
        const { gameState, settings, isDemoMode } = get();
        soundManager.intentSubmit();
        set({ isLoading: true, error: null });

        try {
          const prepared = resolvePlayerAction(gameState, action, 'medium');
          const resolvedState = prepared.nextGameState;
          const resolutionContext = `[Resolved intent: ${prepared.resolution.status}] ${prepared.resolution.summary}`;

          let response: LLMResponse;
          if (isDemoMode) {
            response = getDemoResponse(action);
          } else {
            response = await generateNarrative(
              settings.llmConfig,
              resolvedState,
              `[Intent]: ${action}\n${resolutionContext}`
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

          const newState: GameState = {
            ...resolvedState,
            turns: [...resolvedState.turns, turn],
            currentScene: response.narrative,
          };

          set({
            gameState: newState,
            isLoading: false,
          });

          try {
            await changeTracker.trackStateChange(gameState, newState, newState.turnCount);
            await changeTracker.trackPlayerAction(action, true, newState.turnCount);
            await database.logVisitedLocation(changeTracker['gameId'], newState.location, newState.turnCount);
          } catch (error) {
            console.error('Failed to track changes:', error);
          }

          get().addVisitedLocation(newState.location);
          if (newState.character?.stats.currentHp <= 0) {
            get().setDead(true);
          }
        } catch (error) {
          console.error('Player intent resolution failed:', error);
          set({
            isLoading: false,
            error: (error as Error).message,
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
      
      saveGame: (name: string) => {
        const { gameState, settings, saveSlots } = get();
        const newSlot: SaveSlot = {
          id: uuidv4(),
          name,
          timestamp: Date.now(),
          gameState: JSON.parse(JSON.stringify(gameState)),
          settings: JSON.parse(JSON.stringify(settings)),
          turnCount: gameState.turnCount,
          characterName: gameState.character?.name || 'Unknown',
          characterLevel: gameState.character?.level || 1,
        };
        set({ saveSlots: [...saveSlots, newSlot] });
      },
      
      loadGame: (slotId: string) => {
        const { saveSlots } = get();
        const slot = saveSlots.find(s => s.id === slotId);
        if (slot) {
          set({
            gameState: slot.gameState,
            settings: slot.settings,
            isDemoMode: false,
            activeTab: 'narrative',
          });
        }
      },
      
      deleteSave: (slotId: string) => {
        const { saveSlots } = get();
        set({ saveSlots: saveSlots.filter(s => s.id !== slotId) });
      },
      
      checkAchievements: () => {
        const { gameState, achievements } = get();
        const character = gameState.character;
        if (!character) return;
        
        const updatedAchievements = [...achievements];
        let changed = false;
        
        // Check survivor achievement (10 turns)
        if (gameState.turnCount >= 10) {
          const idx = updatedAchievements.findIndex(a => a.id === 'survivor');
          if (idx !== -1 && !updatedAchievements[idx].unlocked) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlocked: true, unlockedAt: Date.now() };
            changed = true;
          }
        }
        
        // Check treasure hunter (100 gold)
        if (character.gold >= 100) {
          const idx = updatedAchievements.findIndex(a => a.id === 'treasure-hunter');
          if (idx !== -1 && !updatedAchievements[idx].unlocked) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlocked: true, unlockedAt: Date.now() };
            changed = true;
          }
        }
        
        // Check level up (level 2)
        if (character.level >= 2) {
          const idx = updatedAchievements.findIndex(a => a.id === 'level-up');
          if (idx !== -1 && !updatedAchievements[idx].unlocked) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlocked: true, unlockedAt: Date.now() };
            changed = true;
          }
        }
        
        // Check social butterfly (3 relationships)
        if (gameState.relationships.length >= 3) {
          const idx = updatedAchievements.findIndex(a => a.id === 'social-butterfly');
          if (idx !== -1 && !updatedAchievements[idx].unlocked) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlocked: true, unlockedAt: Date.now() };
            changed = true;
          }
        }
        
        // Check master collector (10 items)
        if (character.inventory.length >= 10) {
          const idx = updatedAchievements.findIndex(a => a.id === 'master-collector');
          if (idx !== -1 && !updatedAchievements[idx].unlocked) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlocked: true, unlockedAt: Date.now() };
            changed = true;
          }
        }
        
        // Check storyteller (5 intents)
        const intentCount = gameState.turns.filter(t => t.isIntent).length;
        if (intentCount >= 5) {
          const idx = updatedAchievements.findIndex(a => a.id === 'storyteller');
          if (idx !== -1 && !updatedAchievements[idx].unlocked) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlocked: true, unlockedAt: Date.now() };
            changed = true;
          }
        }
        
        // Check veteran (50 turns)
        if (gameState.turnCount >= 50) {
          const idx = updatedAchievements.findIndex(a => a.id === 'veteran');
          if (idx !== -1 && !updatedAchievements[idx].unlocked) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlocked: true, unlockedAt: Date.now() };
            changed = true;
          }
        }
        
        if (changed) {
          set({ achievements: updatedAchievements });
          // Play achievement sound for any newly unlocked achievements
          const newlyUnlocked = updatedAchievements.filter((a, i) => a.unlocked && !achievements[i].unlocked);
          if (newlyUnlocked.length > 0) {
            soundManager.achievement();
          }
        }
      },
      
      autoSave: () => {
        const { gameState, settings } = get();
        if (!gameState.isGameStarted || !gameState.character) return;
        
        set({ isAutoSaving: true });
        
        // Auto-save to a special slot
        const autoSaveSlot: SaveSlot = {
          id: 'autosave',
          name: 'Auto-save',
          timestamp: Date.now(),
          gameState: JSON.parse(JSON.stringify(gameState)),
          settings: JSON.parse(JSON.stringify(settings)),
          turnCount: gameState.turnCount,
          characterName: gameState.character?.name || 'Unknown',
          characterLevel: gameState.character?.level || 1,
        };
        
        // Update or create autosave slot
        const { saveSlots } = get();
        const existingIndex = saveSlots.findIndex(s => s.id === 'autosave');
        const newSlots = [...saveSlots];
        if (existingIndex >= 0) {
          newSlots[existingIndex] = autoSaveSlot;
        } else {
          newSlots.unshift(autoSaveSlot);
        }
        
        setTimeout(() => {
          set({ 
            saveSlots: newSlots,
            lastAutoSave: Date.now(),
            isAutoSaving: false,
          });
        }, 500);
      },
      
      completeTutorial: () => {
        set({ tutorialCompleted: true });
      },
      
      addJournalEntry: (title: string, content: string) => {
        const { journalEntries, gameState } = get();
        const newEntry: JournalEntry = {
          id: uuidv4(),
          timestamp: Date.now(),
          turnNumber: gameState.turnCount,
          location: gameState.location,
          type: 'manual',
          title,
          content,
        };
        set({ journalEntries: [newEntry, ...journalEntries] });
      },
      
      deleteJournalEntry: (id: string) => {
        const { journalEntries } = get();
        set({ journalEntries: journalEntries.filter(e => e.id !== id) });
      },
      
      addVisitedLocation: (location: string) => {
        const { visitedLocations } = get();
        if (!visitedLocations.includes(location)) {
          set({ visitedLocations: [...visitedLocations, location] });
        }
      },
      
      setDead: (dead: boolean) => {
        if (dead) {
          soundManager.death();
        }
        set({ isDead: dead });
      },
      
      revive: () => {
        const { gameState } = get();
        if (gameState.character) {
          const revivedHp = Math.floor(gameState.character.stats.maxHp / 2);
          const updatedCharacter = {
            ...gameState.character,
            stats: {
              ...gameState.character.stats,
              currentHp: revivedHp,
            },
            gold: Math.floor(gameState.character.gold / 2),
          };
          const simulation = gameState.simulation
            ? {
                ...gameState.simulation,
                character: {
                  ...gameState.simulation.character,
                  hp: Math.min(gameState.simulation.character.maxHp, revivedHp),
                },
              }
            : undefined;
          set({
            isDead: false,
            gameState: {
              ...gameState,
              character: updatedCharacter,
              ...(simulation ? { simulation } : {}),
            },
          });
        }
      },
    }),
    {
      name: 'rpg-game-storage',
      partialize: (state) => ({
        gameState: state.gameState,
        settings: state.settings,
        saveSlots: state.saveSlots,
        achievements: state.achievements,
        journalEntries: state.journalEntries,
        visitedLocations: state.visitedLocations,
        tutorialCompleted: state.tutorialCompleted,
      }),
    }
  )
);

