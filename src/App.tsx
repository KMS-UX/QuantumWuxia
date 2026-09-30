import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import CharacterCreation from './components/CharacterCreation';
import GameScreen from './components/GameScreen';
import SettingsPanel from './components/SettingsPanel';
import WelcomeScreen from './components/WelcomeScreen';
import Tutorial from './components/Tutorial';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import NotificationContainer from './components/NotificationSystem';
import DeathScreen from './components/DeathScreen';
import CommandPalette, { useCommandPalette } from './components/CommandPalette';
import { Settings } from 'lucide-react';

type AppView = 'welcome' | 'character-creation' | 'game' | 'settings';

export default function App() {
  const { gameState, activeTab, setActiveTab, tutorialCompleted, completeTutorial, lastAutoSave, isAutoSaving, autoSave } = useGameStore();
  const [view, setView] = useState<AppView>(
    gameState.isGameStarted ? 'game' : 'welcome'
  );
  const [showTutorial, setShowTutorial] = useState(false);

  // Show tutorial for new players
  useEffect(() => {
    if (gameState.isGameStarted && !tutorialCompleted) {
      setShowTutorial(true);
    }
  }, [gameState.isGameStarted, tutorialCompleted]);

  // Auto-save every 5 turns
  useEffect(() => {
    if (gameState.isGameStarted && gameState.turnCount > 0 && gameState.turnCount % 5 === 0) {
      autoSave();
    }
  }, [gameState.turnCount, gameState.isGameStarted, autoSave]);

  const handleStartAdventure = () => {
    setView('character-creation');
  };

  const handleDemo = () => {
    setView('character-creation');
    // Demo mode will be handled in the game store
    useGameStore.setState({ settings: { ...useGameStore.getState().settings, llmConfig: { ...useGameStore.getState().settings.llmConfig, provider: 'custom', baseUrl: 'demo', model: 'demo' } } });
  };

  const handleOpenSettings = () => {
    setView('settings');
  };

  const handleCloseSettings = () => {
    setView(gameState.isGameStarted ? 'game' : 'welcome');
  };

  // Settings view
  if (view === 'settings') {
    return (
      <div className="relative h-screen overflow-y-auto bg-gray-900">
        <button
          onClick={handleCloseSettings}
          className="fixed top-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-white p-2 rounded-lg transition-all z-50"
        >
          ✕ Close
        </button>
        <SettingsPanel />
      </div>
    );
  }

  // Welcome screen
  if (view === 'welcome') {
    return (
      <div className="relative">
        <WelcomeScreen
          onStart={handleStartAdventure}
          onSettings={handleOpenSettings}
          onDemo={handleDemo}
        />
        <button
          onClick={handleOpenSettings}
          className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-gray-400 hover:text-amber-400 p-3 rounded-full transition-all shadow-lg z-50"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Character creation
  if (view === 'character-creation' && !gameState.isGameStarted) {
    return (
      <div className="relative">
        <CharacterCreation />
        <button
          onClick={handleOpenSettings}
          className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-gray-400 hover:text-amber-400 p-3 rounded-full transition-all shadow-lg z-50"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Game screen
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const { isDead, gameState: currentGameState, resetGame, revive, saveSlots } = useGameStore();

  const commandPaletteCommands = [
    { id: 'save', label: 'Save Game', icon: '💾', category: 'Game', description: 'Save your current progress', action: () => {} },
    { id: 'settings', label: 'Open Settings', icon: '⚙️', category: 'Game', description: 'Configure AI and preferences', action: () => setActiveTab('settings') },
    { id: 'character', label: 'View Character', icon: '🧙', category: 'Game', description: 'View your character sheet', action: () => setActiveTab('character') },
    { id: 'inventory', label: 'View Inventory', icon: '🎒', category: 'Game', description: 'Check your items', action: () => setActiveTab('inventory') },
    { id: 'quests', label: 'View Quests', icon: '📋', category: 'Game', description: 'Check your quest log', action: () => setActiveTab('quests') },
    { id: 'new-game', label: 'New Game', icon: '🎮', category: 'Game', description: 'Start a new adventure', action: () => resetGame() },
  ];

  return (
    <div className="relative h-screen">
      {/* Tutorial */}
      {showTutorial && (
        <Tutorial
          onComplete={() => {
            setShowTutorial(false);
            completeTutorial();
          }}
          onSkip={() => {
            setShowTutorial(false);
            completeTutorial();
          }}
        />
      )}

      {/* Auto-save indicator */}
      <AutoSaveIndicator lastSaved={lastAutoSave} isSaving={isAutoSaving} />

      {/* Notifications */}
      <NotificationContainer />

      {/* Death Screen */}
      {isDead && currentGameState.character && (
        <DeathScreen
          characterName={currentGameState.character.name}
          level={currentGameState.character.level}
          turnsSurvived={currentGameState.turnCount}
          hasSaves={saveSlots.length > 0}
          onRespawn={(option) => {
            if (option === 'continue') {
              revive();
            } else if (option === 'loadSave') {
              // Load the most recent save
              if (saveSlots.length > 0) {
                const latestSave = saveSlots.sort((a, b) => b.timestamp - a.timestamp)[0];
                useGameStore.getState().loadGame(latestSave.id);
              }
            } else if (option === 'newGame') {
              resetGame();
            }
          }}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        commands={commandPaletteCommands}
      />

      {/* Keyboard shortcuts help */}
      <KeyboardShortcuts />

      {/* Mobile panels overlay */}
      {activeTab === 'settings' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900">
          <button
            onClick={() => setActiveTab('narrative')}
            className="fixed top-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-white p-2 rounded-lg transition-all z-50"
          >
            ✕ Close
          </button>
          <SettingsPanel />
        </div>
      )}
      
      {activeTab === 'character' && (
        <CharacterPanel />
      )}
      
      {activeTab === 'inventory' && (
        <InventoryPanel />
      )}
      
      {activeTab === 'quests' && (
        <QuestsPanel />
      )}

      {/* Main game screen */}
      <GameScreen />
    </div>
  );
}

function CharacterPanel() {
  const { gameState, setActiveTab } = useGameStore();
  const character = gameState.character!;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto p-4 md:p-8">
      <button
        onClick={() => setActiveTab('narrative')}
        className="fixed top-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-white p-2 rounded-lg transition-all z-50"
      >
        ✕ Close
      </button>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">🧙 Character Sheet</h1>
        
        {/* Character Info */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-3xl">
              {character.race === 'Elf' ? '🧝' : character.race === 'Dwarf' ? '⛏️' : character.race === 'Halfling' ? '🍀' : character.race === 'Dragonborn' ? '🐉' : character.race === 'Tiefling' ? '😈' : '👤'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{character.name}</h2>
              <p className="text-gray-400">Level {character.level} {character.race} {character.class}</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-300 italic mb-4">{character.background}</p>
          
          {/* Vital Stats */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-400">❤️ Health</span>
                <span className="text-white">{character.stats.currentHp}/{character.stats.maxHp}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${(character.stats.currentHp / character.stats.maxHp) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-400">💧 Mana</span>
                <span className="text-white">{character.stats.currentMana}/{character.stats.maxMana}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all" style={{ width: `${(character.stats.currentMana / character.stats.maxMana) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-purple-400">⭐ Experience</span>
                <span className="text-white">{character.experience}/{character.level * 100}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all" style={{ width: `${(character.experience / (character.level * 100)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-4">
          <h3 className="text-lg font-bold text-white mb-4">Attributes</h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { name: 'STR', value: character.stats.strength, icon: '💪', color: 'text-red-400' },
              { name: 'AGI', value: character.stats.agility, icon: '🏃', color: 'text-green-400' },
              { name: 'INT', value: character.stats.intelligence, icon: '🧠', color: 'text-blue-400' },
              { name: 'CHA', value: character.stats.charisma, icon: '✨', color: 'text-pink-400' },
              { name: 'LCK', value: character.stats.luck, icon: '🍀', color: 'text-yellow-400' },
            ].map((stat) => (
              <div key={stat.name} className="text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-4">
          <h3 className="text-lg font-bold text-white mb-4">Skills & Abilities</h3>
          {character.skills.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No skills learned yet. Skills are gained through gameplay.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {character.skills.map((skill: string, i: number) => (
                <span key={i} className="bg-purple-900/50 border border-purple-700/50 text-purple-300 px-3 py-1 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Gold */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">💰 Gold</h3>
          <p className="text-3xl font-bold text-yellow-400">{character.gold}g</p>
        </div>
      </div>
    </div>
  );
}

function InventoryPanel() {
  const { gameState, setActiveTab } = useGameStore();
  const character = gameState.character!;

  const typeIcons: Record<string, string> = {
    weapon: '⚔️',
    armor: '🛡️',
    potion: '🧪',
    quest: '📜',
    misc: '📦',
  };

  const typeColors: Record<string, string> = {
    weapon: 'border-red-700/50 bg-red-900/20',
    armor: 'border-blue-700/50 bg-blue-900/20',
    potion: 'border-green-700/50 bg-green-900/20',
    quest: 'border-amber-700/50 bg-amber-900/20',
    misc: 'border-gray-700/50 bg-gray-900/20',
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto p-4 md:p-8">
      <button
        onClick={() => setActiveTab('narrative')}
        className="fixed top-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-white p-2 rounded-lg transition-all z-50"
      >
        ✕ Close
      </button>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">🎒 Inventory</h1>
        
        {character.inventory.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-lg">Your bag is empty.</p>
            <p className="text-gray-500 text-sm mt-2">Items will appear here as you find them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {character.inventory.map((item: any) => (
              <div key={item.id} className={`border rounded-xl p-4 ${typeColors[item.type]}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeIcons[item.type]}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white">{item.name}</h4>
                      <span className="text-xs text-gray-400">x{item.quantity}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                      <span className="text-xs text-yellow-400">{item.value}g</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestsPanel() {
  const { gameState, setActiveTab } = useGameStore();

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto p-4 md:p-8">
      <button
        onClick={() => setActiveTab('narrative')}
        className="fixed top-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-white p-2 rounded-lg transition-all z-50"
      >
        ✕ Close
      </button>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">📋 Quest Log</h1>
        
        {gameState.questLog.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-lg">No quests yet.</p>
            <p className="text-gray-500 text-sm mt-2">Quests will appear as you explore the world.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gameState.questLog.map((quest) => (
              <div key={quest.id} className={`border rounded-xl p-4 ${
                quest.status === 'active' ? 'border-amber-700/50 bg-amber-900/20' :
                quest.status === 'completed' ? 'border-green-700/50 bg-green-900/20' :
                'border-red-700/50 bg-red-900/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{quest.status === 'active' ? '📋' : quest.status === 'completed' ? '✅' : '❌'}</span>
                  <h4 className="font-bold text-white">{quest.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    quest.status === 'active' ? 'bg-amber-900/50 text-amber-300' :
                    quest.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                    'bg-red-900/50 text-red-300'
                  }`}>
                    {quest.status}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{quest.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Relationships */}
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">👥 Known Characters</h2>
        {gameState.relationships.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-lg">You haven't met anyone notable yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gameState.relationships.map((rel) => (
              <div key={rel.id} className="border border-gray-700 rounded-xl p-4 bg-gray-800/30">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white">{rel.name}</h4>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      rel.type === 'ally' ? 'bg-green-900/50 text-green-300' :
                      rel.type === 'enemy' ? 'bg-red-900/50 text-red-300' :
                      rel.type === 'merchant' ? 'bg-yellow-900/50 text-yellow-300' :
                      rel.type === 'mentor' ? 'bg-purple-900/50 text-purple-300' :
                      'bg-gray-700/50 text-gray-300'
                    }`}>
                      {rel.type}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-1">{rel.notes}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-500">Disposition</span>
                    <span className={rel.disposition > 0 ? 'text-green-400' : rel.disposition < 0 ? 'text-red-400' : 'text-gray-400'}>
                      {rel.disposition > 0 ? '+' : ''}{rel.disposition}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${rel.disposition > 0 ? 'bg-green-500' : rel.disposition < 0 ? 'bg-red-500' : 'bg-gray-500'}`}
                      style={{ width: `${Math.abs(rel.disposition)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
