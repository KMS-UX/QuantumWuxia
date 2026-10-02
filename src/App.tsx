import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import CharacterCreation from './components/CharacterCreation';
import GameScreen from './components/GameScreen';
import SettingsPanel from './components/SettingsPanel';
import MainMenu from './components/MainMenu';
import SaveLoadModal from './components/SaveLoadModal';
import Tutorial from './components/Tutorial';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import NotificationContainer from './components/NotificationSystem';
import DeathScreen from './components/DeathScreen';
import CommandPalette, { useCommandPalette } from './components/CommandPalette';
import { Settings } from 'lucide-react';

type AppView = 'main-menu' | 'character-creation' | 'game' | 'settings';

export default function App() {
  const { gameState, activeTab, setActiveTab, tutorialCompleted, completeTutorial, lastAutoSave, isAutoSaving, autoSave, saveSlots } = useGameStore();
  const [view, setView] = useState<AppView>(
    gameState.isGameStarted ? 'game' : 'main-menu'
  );
  const [viewBeforeSettings, setViewBeforeSettings] = useState<AppView>('main-menu');
  const [showTitleLoad, setShowTitleLoad] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleMainMenuNewGame = () => {
    setView('character-creation');
  };

  const handleMainMenuContinue = () => {
    if (gameState.isGameStarted) {
      setView('game');
    }
  };

  const handleMainMenuLoad = () => {
    setShowTitleLoad(true);
  };

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

  const handleDemo = () => {
    setView('character-creation');
    // Demo mode will be handled in the game store
    useGameStore.setState({ settings: { ...useGameStore.getState().settings, llmConfig: { ...useGameStore.getState().settings.llmConfig, provider: 'custom', baseUrl: 'demo', model: 'demo' } } });
  };

  const handleOpenSettings = () => {
    setViewBeforeSettings(view);
    setView('settings');
  };

  const handleCloseSettings = () => {
    setView(gameState.isGameStarted ? 'game' : viewBeforeSettings);
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

  // Main Menu
  if (view === 'main-menu') {
    return (
      <>
        <MainMenu
          hasSaveData={gameState.isGameStarted || saveSlots.length > 0}
          onNewGame={handleMainMenuNewGame}
          onContinue={handleMainMenuContinue}
          onLoadGame={handleMainMenuLoad}
          onSettings={handleOpenSettings}
          onDemo={handleDemo}
        />
        {showTitleLoad && (
          <SaveLoadModal
            initialMode="load"
            allowSave={false}
            themeWuxia
            onClose={() => setShowTitleLoad(false)}
            onLoaded={() => { setShowTitleLoad(false); setView('game'); }}
          />
        )}
      </>
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
  const { isDead, gameState: currentGameState, resetGame, revive } = useGameStore();

  const commandPaletteCommands = [
    { id: 'save', label: 'Quick Save', icon: '💾', category: 'Game', description: 'Save your current journey', action: () => useGameStore.getState().saveGame('Quick Save') },
    { id: 'settings', label: 'Open Settings', icon: '⚙️', category: 'Game', description: 'Configure AI and preferences', action: () => setActiveTab('settings') },
    { id: 'character', label: gameState.character?.originId ? 'Cultivation Record' : 'View Character', icon: '🧘', category: 'Game', description: 'View your character sheet', action: () => setActiveTab('character') },
    { id: 'inventory', label: gameState.character?.originId ? 'View Possessions' : 'View Inventory', icon: '🎒', category: 'Game', description: 'Check your items', action: () => setActiveTab('inventory') },
    { id: 'quests', label: gameState.character?.originId ? 'View Jianghu Ledger' : 'View Quests', icon: '📋', category: 'Game', description: 'Review local events and known ties', action: () => setActiveTab('quests') },
    { id: 'new-game', label: 'New Journey', icon: '🎮', category: 'Game', description: 'Start a new adventure', action: () => resetGame() },
  ];

  return (
    <div className="relative h-screen">
      {/* Tutorial */}
      {showTutorial && (
        <Tutorial
          wuxia={Boolean(gameState.character?.originId)}
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
          allowContinue={!currentGameState.character.originId}
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
  const simulation = gameState.simulation;
  const wuxia = character.originId ? simulation?.character.wuxia : undefined;

  if (wuxia && simulation) {
    const simCharacter = simulation.character;
    const attributes = [
      ['Strength', simCharacter.attributes.strength], ['Agility', simCharacter.attributes.agility],
      ['Constitution', simCharacter.attributes.constitution], ['Perception', simCharacter.attributes.perception],
      ['Intelligence', simCharacter.attributes.intelligence], ['Charisma', simCharacter.attributes.charisma], ['Luck', simCharacter.attributes.luck],
    ];
    return (
      <div className="jianghu-overlay fixed inset-0 z-50 overflow-y-auto p-4 md:p-8">
        <button onClick={() => setActiveTab('narrative')} className="fixed right-4 top-4 z-50 border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 hover:border-emerald-300">Close</button>
        <div className="mx-auto max-w-3xl">
          <p className="jianghu-eyebrow">NINE RIVERS JIANGHU · TURN {simulation.world.turn}</p>
          <h1 className="mb-1 font-[var(--font-display)] text-3xl text-stone-100">Cultivation record</h1>
          <p className="mb-7 text-sm text-gray-400">{character.name} · {character.class} · {simCharacter.locationId}</p>

          <section className="jianghu-sheet-section">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <WuxiaMeter label="Health" value={simCharacter.hp} max={simCharacter.maxHp} tone="red" />
              <WuxiaMeter label="Qi" value={simCharacter.qi} max={simCharacter.maxQi} tone="jade" />
              <WuxiaMeter label="Fatigue" value={simCharacter.fatigue} max={100} tone="brass" />
              <WuxiaMeter label="Face" value={wuxia.social.face} max={100} tone="cinnabar" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-4">
              <div><span className="text-gray-500">Cultivation</span><div className="mt-1 capitalize text-emerald-100">{wuxia.cultivation.stage.replace('_', ' ')}</div></div>
              <div><span className="text-gray-500">Qi control</span><div className="mt-1 text-stone-100">{wuxia.cultivation.qiControl}/100</div></div>
              <div><span className="text-gray-500">Meridians</span><div className="mt-1 text-stone-100">{wuxia.cultivation.meridianIntegrity}/100</div></div>
              <div><span className="text-gray-500">Insight</span><div className="mt-1 text-stone-100">{wuxia.cultivation.accumulatedInsight}</div></div>
            </div>
          </section>

          <section className="jianghu-sheet-section">
            <h2 className="jianghu-sheet-heading">Attributes</h2>
            <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-4">{attributes.map(([label, value]) => <div key={label} className="flex justify-between pr-5 text-sm"><span className="text-gray-400">{label}</span><strong className="text-stone-100">{value}</strong></div>)}</div>
          </section>

          <section className="jianghu-sheet-section">
            <h2 className="jianghu-sheet-heading">Martial arts</h2>
            {wuxia.martialArts.length ? <div className="divide-y divide-white/10">{wuxia.martialArts.map(art => (
              <div key={art.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3"><h3 className="font-semibold text-emerald-100">{art.name}</h3><span className="text-sm text-amber-200">Mastery {art.mastery}</span></div>
                <div className="mt-2 h-1 bg-white/10"><div className="h-full bg-emerald-400" style={{ width: `${art.mastery}%` }} /></div>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">{art.techniques.map(technique => {
                  const available = technique.minMastery === undefined || art.mastery >= technique.minMastery;
                  return <li key={technique.id} className="flex justify-between gap-3 text-xs"><span className={available ? 'text-gray-200' : 'text-gray-500'}>{technique.name}{!available && ` · mastery ${technique.minMastery} required`}</span><span className="shrink-0 text-cyan-200">{technique.qiCost} Qi</span></li>;
                })}</ul>
              </div>
            ))}</div> : <p className="text-sm text-gray-500">No arts learned yet.</p>}
          </section>

          <section className="jianghu-sheet-section">
            <h2 className="jianghu-sheet-heading">Injuries</h2>
            {wuxia.injuries.length ? <div className="grid gap-3 sm:grid-cols-2">{wuxia.injuries.map(injury => <div key={injury.id} className="border-l-2 border-rose-400/70 pl-3"><div className="text-sm text-rose-100">{injury.bodyRegion.replace(/([A-Z])/g, ' $1').toLowerCase()} · severity {injury.severity}</div><div className="mt-1 text-xs text-gray-400">{injury.healingTurns} turns to heal{injury.untreated ? ' · untreated' : ''}</div></div>)}</div> : <p className="text-sm text-gray-500">No active injuries.</p>}
          </section>
        </div>
      </div>
    );
  }

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

function WuxiaMeter({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'red' | 'jade' | 'brass' | 'cinnabar' }) {
  const tones = { red: 'bg-rose-500', jade: 'bg-emerald-400', brass: 'bg-amber-300', cinnabar: 'bg-orange-400' };
  return <div><div className="mb-2 flex justify-between text-xs"><span className="text-gray-400">{label}</span><span className="text-stone-100">{value}/{max}</span></div><div className="h-1.5 bg-white/10"><div className={`h-full ${tones[tone]}`} style={{ width: `${max ? Math.max(0, Math.min(100, value / max * 100)) : 0}%` }} /></div></div>;
}

function InventoryPanel() {
  const { gameState, setActiveTab } = useGameStore();
  const character = gameState.character!;
  const isWuxia = Boolean(character.originId && gameState.simulation?.character.wuxia);

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
    <div className={`fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 ${isWuxia ? 'jianghu-overlay' : 'bg-gray-900'}`}>
      <button
        onClick={() => setActiveTab('narrative')}
        className="fixed top-4 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-white p-2 rounded-lg transition-all z-50"
      >
        ✕ Close
      </button>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="mb-6 text-3xl font-bold text-white">{isWuxia ? 'Carried possessions' : 'Inventory'}</h1>
        
        {character.inventory.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-lg">{isWuxia ? 'You carry nothing.' : 'Your bag is empty.'}</p>
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
                      <span className="text-xs text-gray-500 capitalize">{isWuxia ? item.type === 'misc' ? 'possession' : item.type : item.type}</span>
                      {!isWuxia && <span className="text-xs text-yellow-400">{item.value}g</span>}
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
  const simulation = gameState.simulation;

  if (gameState.character?.originId && simulation?.jianghu) {
    const locationId = simulation.character.locationId;
    const playerId = simulation.character.id;
    const publicEvents = simulation.jianghu.worldEvents.filter(event => event.active && event.locationId === locationId);
    const knownRumors = simulation.jianghu.rumors.filter(rumor => rumor.knownBy.includes(playerId));
    const peopleHere = simulation.jianghu.npcs.filter(npc => npc.alive && npc.locationId === locationId);
    const ties = simulation.jianghu.relationships.filter(relation => relation.subjectId === playerId);
    const npcById = new Map(simulation.jianghu.npcs.map(npc => [npc.id, npc]));

    return (
      <div className="jianghu-overlay fixed inset-0 z-50 overflow-y-auto p-4 md:p-8">
        <button onClick={() => setActiveTab('narrative')} className="fixed right-4 top-4 z-50 border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 hover:border-emerald-300">Close</button>
        <div className="mx-auto max-w-3xl">
          <p className="jianghu-eyebrow">{locationId.toUpperCase()} · TURN {simulation.world.turn}</p>
          <h1 className="mb-7 font-[var(--font-display)] text-3xl text-stone-100">Jianghu ledger</h1>

          <section className="jianghu-sheet-section">
            <h2 className="jianghu-sheet-heading">Public situation here</h2>
            {publicEvents.length ? <div className="space-y-4">{publicEvents.map(event => <article key={event.id}><h3 className="font-semibold text-amber-100">{event.title}</h3><p className="mt-1 text-sm leading-relaxed text-gray-300">{event.description}</p></article>)}</div> : <p className="text-sm text-gray-500">No pressing public event here.</p>}
          </section>

          <section className="jianghu-sheet-section">
            <h2 className="jianghu-sheet-heading">People present</h2>
            {peopleHere.length ? <div className="grid gap-3 sm:grid-cols-2">{peopleHere.map(npc => <div key={npc.id} className="border-l border-emerald-300/50 pl-3"><h3 className="text-sm font-semibold text-emerald-100">{npc.name}</h3><p className="text-xs text-gray-400">{npc.role}</p></div>)}</div> : <p className="text-sm text-gray-500">No one of note is nearby.</p>}
          </section>

          <section className="jianghu-sheet-section">
            <h2 className="jianghu-sheet-heading">Rumors you have heard</h2>
            {knownRumors.length ? <div className="space-y-3">{knownRumors.map(rumor => <article key={rumor.id} className="border-l border-amber-200/50 pl-3"><p className="text-sm text-gray-200">{rumor.text}</p><p className="mt-1 text-xs capitalize text-gray-500">{rumor.status} · credibility {rumor.credibility}</p></article>)}</div> : <p className="text-sm text-gray-500">No rumors recorded yet.</p>}
          </section>

          <section className="jianghu-sheet-section">
            <h2 className="jianghu-sheet-heading">Your ties</h2>
            {ties.length ? <div className="grid gap-3 sm:grid-cols-2">{ties.map(tie => {
              const npc = npcById.get(tie.targetId);
              return npc ? <article key={tie.id} className="text-sm"><h3 className="font-semibold text-stone-100">{npc.name}</h3><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400"><span>Trust {tie.trust}</span><span>Respect {tie.respect}</span><span>Fear {tie.fear}</span><span>Debt {tie.debt}</span></div></article> : null;
            })}</div> : <p className="text-sm text-gray-500">No personal ties have been recorded yet.</p>}
          </section>
        </div>
      </div>
    );
  }

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
