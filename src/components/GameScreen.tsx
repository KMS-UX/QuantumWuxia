import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Send, Swords, Scroll, User, Settings, Package, MapPin, Heart, Droplets, Coins, Star, Zap, AlertCircle, Save, BookOpen } from 'lucide-react';
import SaveLoadModal from './SaveLoadModal';
import WeatherDisplay from './WeatherSystem';
import MiniMap from './MiniMap';
import Journal from './Journal';

export default function GameScreen() {
  const {
    gameState,
    isLoading,
    error,
    activeTab,
    isDemoMode,
    makeChoice,
    useIntent,
    setActiveTab,
    clearError,
  } = useGameStore();
  
  const [intentText, setIntentText] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const narrativeEndRef = useRef<HTMLDivElement>(null);
  const character = gameState.character!;
  const lastTurn = gameState.turns[gameState.turns.length - 1];
  const { visitedLocations, journalEntries, addJournalEntry, deleteJournalEntry, settings } = useGameStore();

  useEffect(() => {
    narrativeEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.turns]);

  // Keyboard shortcuts for choices (1-5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = parseInt(e.key);
      if (key >= 1 && key <= 5 && lastTurn && !isLoading) {
        const choice = lastTurn.choices.find(c => c.id === key);
        if (choice) {
          makeChoice(choice.id, choice.text);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastTurn, isLoading, makeChoice]);

  const handleIntent = () => {
    if (intentText.trim() && !isLoading) {
      useIntent(intentText.trim());
      setIntentText('');
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleIntent();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-amber-400 hidden md:block">⚔️ Realm of Echoes</h1>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            Turn {gameState.turnCount}
          </span>
          <WeatherDisplay turnCount={gameState.turnCount} worldTheme={settings.worldTheme} />
          <button
            onClick={() => setShowSaveModal(true)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-2 py-1 rounded transition-all flex items-center gap-1"
            title="Save/Load Game"
          >
            <Save className="w-3 h-3" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={() => setShowJournal(!showJournal)}
            className={`text-xs px-2 py-1 rounded transition-all flex items-center gap-1 ${
              showJournal ? 'bg-amber-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
            }`}
            title="Journal"
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden sm:inline">Journal</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <MiniMap
            currentLocation={gameState.location}
            visitedLocations={visitedLocations}
            totalLocations={Math.max(8, visitedLocations.length + 3)}
          />
          <div className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-gray-300">{character.gold}g</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-gray-300">Lv.{character.level}</span>
          </div>
        </div>
      </header>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-900/30 border-b border-amber-700/50 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300">
              <strong>Demo Mode</strong> — Pre-written narrative. Connect an LLM in Settings for full AI-powered storytelling.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Configure AI →
          </button>
        </div>
      )}

      {/* Journal Panel */}
      {showJournal && (
        <div className="absolute top-14 right-4 z-30 w-96 max-h-[70vh] overflow-y-auto shadow-2xl">
          <Journal
            entries={journalEntries}
            onAddEntry={addJournalEntry}
            onDeleteEntry={deleteJournalEntry}
            currentTurn={gameState.turnCount}
            currentLocation={gameState.location}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Character Info */}
        <aside className="w-64 bg-gray-800/50 border-r border-gray-700 p-4 overflow-y-auto shrink-0 hidden lg:block">
          {/* Character Card */}
          <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-lg">
                {character.race === 'Elf' ? '🧝' : character.race === 'Dwarf' ? '⛏️' : character.race === 'Halfling' ? '🍀' : character.race === 'Dragonborn' ? '🐉' : character.race === 'Tiefling' ? '😈' : '👤'}
              </div>
              <div>
                <div className="font-bold text-sm">{character.name}</div>
                <div className="text-xs text-gray-400">{character.race} {character.class}</div>
              </div>
            </div>
            
            {/* HP Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="flex items-center gap-1 text-red-400">
                  <Heart className="w-3 h-3" /> HP
                </span>
                <span>{character.stats.currentHp}/{character.stats.maxHp}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                  style={{ width: `${(character.stats.currentHp / character.stats.maxHp) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Mana Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="flex items-center gap-1 text-blue-400">
                  <Droplets className="w-3 h-3" /> MP
                </span>
                <span>{character.stats.currentMana}/{character.stats.maxMana}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all"
                  style={{ width: `${(character.stats.currentMana / character.stats.maxMana) * 100}%` }}
                />
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="flex items-center gap-1 text-purple-400">
                  <Star className="w-3 h-3" /> XP
                </span>
                <span>{character.experience}/{character.level * 100}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all"
                  style={{ width: `${(character.experience / (character.level * 100)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700 mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Stats</h3>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">STR</span>
                <span className="text-white font-bold">{character.stats.strength}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">AGI</span>
                <span className="text-white font-bold">{character.stats.agility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">INT</span>
                <span className="text-white font-bold">{character.stats.intelligence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">CHA</span>
                <span className="text-white font-bold">{character.stats.charisma}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">LCK</span>
                <span className="text-white font-bold">{character.stats.luck}</span>
              </div>
            </div>
          </div>

          {/* Skills */}
          {character.skills.length > 0 && (
            <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700 mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1">
                {character.skills.map((skill, i) => (
                  <span key={i} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Preview */}
          <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Inventory ({character.inventory.length})</h3>
            <div className="space-y-1">
              {character.inventory.slice(0, 5).map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-gray-300 truncate">{item.name}</span>
                  <span className="text-gray-500">x{item.quantity}</span>
                </div>
              ))}
              {character.inventory.length > 5 && (
                <div className="text-xs text-gray-500">+{character.inventory.length - 5} more...</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Narrative Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Narrative Scroll */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {gameState.turns.map((turn, index) => (
                <div key={turn.id} className="space-y-3">
                  {/* Narrative */}
                  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">Turn {index + 1}</span>
                      {turn.isIntent && (
                        <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">
                          🔮 Intent
                        </span>
                      )}
                    </div>
                    <div className="prose prose-inverse prose-sm max-w-none">
                      <NarrativeText text={turn.narrative} />
                    </div>
                  </div>
                  
                  {/* Player Action */}
                  {turn.playerAction && (
                    <div className="flex justify-end">
                      <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-3 py-2 max-w-md">
                        <div className="text-xs text-amber-400 mb-0.5">You:</div>
                        <div className="text-sm text-amber-100">{turn.playerAction}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-gray-400 text-sm">The story unfolds...</span>
                  </div>
                </div>
              )}
              
              <div ref={narrativeEndRef} />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-4 mb-2 bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center justify-between">
              <span className="text-red-300 text-sm">{error}</span>
              <button onClick={clearError} className="text-red-400 hover:text-red-300 text-sm">✕</button>
            </div>
          )}

          {/* Choices */}
          {lastTurn && !isLoading && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                  {lastTurn.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => makeChoice(choice.id, choice.text)}
                      disabled={isLoading}
                      className={`text-left p-3 rounded-lg border transition-all hover:scale-[1.02] ${
                        choice.risk === 'low'
                          ? 'border-green-700/50 bg-green-900/20 hover:bg-green-900/40 hover:border-green-600'
                          : choice.risk === 'medium'
                          ? 'border-yellow-700/50 bg-yellow-900/20 hover:bg-yellow-900/40 hover:border-yellow-600'
                          : 'border-red-700/50 bg-red-900/20 hover:bg-red-900/40 hover:border-red-600'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold text-sm shrink-0">{choice.id}.</span>
                        <div>
                          <div className="text-sm text-gray-200">{choice.text}</div>
                          <div className={`text-xs mt-0.5 ${
                            choice.risk === 'low' ? 'text-green-400' :
                            choice.risk === 'medium' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {choice.risk === 'low' ? '🟢 Safe' : choice.risk === 'medium' ? '🟡 Risky' : '🔴 Dangerous'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Intent Input */}
          <div className="px-4 pb-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={intentText}
                    onChange={(e) => setIntentText(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="🔮 Write what you want to do... (or choose an option above)"
                    rows={2}
                    disabled={isLoading}
                    className="w-full bg-gray-800/80 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none text-sm disabled:opacity-50"
                  />
                  <div className="absolute bottom-2 right-3 text-xs text-gray-500">
                    {intentText.length}/200
                  </div>
                </div>
                <button
                  onClick={handleIntent}
                  disabled={isLoading || !intentText.trim()}
                  className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel - Mobile Tabs */}
        <aside className="w-64 bg-gray-800/50 border-l border-gray-700 overflow-y-auto shrink-0 hidden xl:block">
          <RightPanel />
        </aside>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="lg:hidden bg-gray-800 border-t border-gray-700 flex shrink-0">
        <button
          onClick={() => setActiveTab('narrative')}
          className={`flex-1 py-2 text-center text-xs ${activeTab === 'narrative' ? 'text-amber-400' : 'text-gray-400'}`}
        >
          <Scroll className="w-4 h-4 mx-auto mb-0.5" />
          Story
        </button>
        <button
          onClick={() => setActiveTab('character')}
          className={`flex-1 py-2 text-center text-xs ${activeTab === 'character' ? 'text-amber-400' : 'text-gray-400'}`}
        >
          <User className="w-4 h-4 mx-auto mb-0.5" />
          Hero
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-2 text-center text-xs ${activeTab === 'inventory' ? 'text-amber-400' : 'text-gray-400'}`}
        >
          <Package className="w-4 h-4 mx-auto mb-0.5" />
          Items
        </button>
        <button
          onClick={() => setActiveTab('quests')}
          className={`flex-1 py-2 text-center text-xs ${activeTab === 'quests' ? 'text-amber-400' : 'text-gray-400'}`}
        >
          <Swords className="w-4 h-4 mx-auto mb-0.5" />
          Quests
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-center text-xs ${activeTab === 'settings' ? 'text-amber-400' : 'text-gray-400'}`}
        >
          <Settings className="w-4 h-4 mx-auto mb-0.5" />
          Settings
        </button>
      </nav>

      {/* Save/Load Modal */}
      {showSaveModal && <SaveLoadModal onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}

function NarrativeText({ text }: { text: string }) {
  // Simple markdown-like rendering
  const lines = text.split('\n');
  
  return (
    <div className="text-gray-200 text-sm leading-relaxed space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-bold text-amber-300">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-white">{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.startsWith('*') && line.endsWith('*')) {
          return <p key={i} className="italic text-gray-400">{line.replace(/\*/g, '')}</p>;
        }
        if (line.startsWith('- ')) {
          return <p key={i} className="text-gray-300 pl-3">• {line.replace('- ', '')}</p>;
        }
        if (line.trim() === '') return null;
        
        // Handle inline formatting
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="text-gray-400 italic">$1</em>');
        
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </div>
  );
}

function RightPanel() {
  const { gameState } = useGameStore();
  const character = gameState.character!;
  
  return (
    <div className="p-4 space-y-4">
      {/* Quest Log */}
      <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
          <Scroll className="w-3 h-3" /> Quest Log
        </h3>
        {gameState.questLog.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No active quests yet...</p>
        ) : (
          <div className="space-y-2">
            {gameState.questLog.map((quest) => (
              <div key={quest.id} className="text-xs">
                <div className={`font-bold ${
                  quest.status === 'active' ? 'text-amber-400' :
                  quest.status === 'completed' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {quest.status === 'active' ? '📋' : quest.status === 'completed' ? '✅' : '❌'} {quest.title}
                </div>
                <div className="text-gray-400 mt-0.5">{quest.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relationships */}
      <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
          <User className="w-3 h-3" /> Known Characters
        </h3>
        {gameState.relationships.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No one of note yet...</p>
        ) : (
          <div className="space-y-2">
            {gameState.relationships.map((rel) => (
              <div key={rel.id} className="text-xs">
                <div className="flex justify-between">
                  <span className="text-white font-bold">{rel.name}</span>
                  <span className={`text-xs ${
                    rel.disposition > 50 ? 'text-green-400' :
                    rel.disposition > 0 ? 'text-yellow-400' :
                    rel.disposition > -50 ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {rel.type}
                  </span>
                </div>
                <div className="text-gray-400 mt-0.5">{rel.notes}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Inventory */}
      <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
          <Package className="w-3 h-3" /> Full Inventory
        </h3>
        <div className="space-y-1">
          {character.inventory.map((item) => (
            <div key={item.id} className="flex justify-between text-xs items-center">
              <div>
                <span className={`mr-1 ${
                  item.type === 'weapon' ? 'text-red-400' :
                  item.type === 'armor' ? 'text-blue-400' :
                  item.type === 'potion' ? 'text-green-400' :
                  item.type === 'quest' ? 'text-amber-400' : 'text-gray-400'
                }`}>
                  {item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : item.type === 'potion' ? '🧪' : item.type === 'quest' ? '📜' : '📦'}
                </span>
                <span className="text-gray-300">{item.name}</span>
              </div>
              <span className="text-gray-500">x{item.quantity}</span>
            </div>
          ))}
          {character.inventory.length === 0 && (
            <p className="text-xs text-gray-500 italic">Empty</p>
          )}
        </div>
      </div>

      {/* Combat Stats */}
      <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Combat Readiness
        </h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Attack Power</span>
            <span className="text-white">{character.stats.strength * 2 + character.level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Defense</span>
            <span className="text-white">{character.stats.strength + character.stats.agility}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Evasion</span>
            <span className="text-white">{character.stats.agility * 2}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Crit Chance</span>
            <span className="text-white">{character.stats.luck * 3}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
