import { useState, useEffect } from 'react';
import { database, ChangeLogEntry, GameStatistics } from '../services/database';
import { Database, History, TrendingUp, Download, Upload, Trash2, RefreshCw, Filter, Search } from 'lucide-react';

interface DatabaseManagerProps {
  onClose: () => void;
}

export default function DatabaseManager({ onClose }: DatabaseManagerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'changelog' | 'statistics' | 'management'>('overview');
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [statistics, setStatistics] = useState<GameStatistics | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const info = await database.getDatabaseInfo();
      setDbInfo(info);

      if (activeTab === 'changelog') {
        const logs = filterType === 'all' 
          ? await database.getAllChangeLogs(200)
          : await database.getChangeLogByType(filterType as any, 200);
        setChangeLog(logs);
      }

      if (activeTab === 'statistics') {
        const stats = await database.getStatistics();
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setIsLoading(false);
  };

  const handleExport = async () => {
    try {
      const data = await database.exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `realm-of-echoes-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await database.importDatabase(text);
        alert('Database imported successfully!');
        loadData();
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Please check the file format.');
      }
    };
    input.click();
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ This will delete ALL game data including saves, achievements, and history. This cannot be undone. Are you absolutely sure?')) {
      return;
    }
    if (!confirm('⚠️ FINAL WARNING: All data will be permanently deleted. Continue?')) {
      return;
    }

    try {
      await database.clearAllData();
      alert('All data cleared successfully.');
      loadData();
    } catch (error) {
      console.error('Clear failed:', error);
    }
  };

  const filteredChangeLog = searchQuery
    ? changeLog.filter(entry => 
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : changeLog;

  const changeTypes = [
    'all',
    'state_change',
    'item_gained',
    'item_lost',
    'level_up',
    'achievement_unlocked',
    'quest_started',
    'quest_completed',
    'relationship_changed',
    'location_changed',
    'combat',
    'choice_made',
    'intent_used',
    'spell_cast',
    'craft',
    'purchase',
    'sale',
    'survival_change',
    'faction_change',
    'journal_entry',
  ];

  const getChangeTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      state_change: '🔄',
      item_gained: '🎁',
      item_lost: '💔',
      level_up: '⭐',
      achievement_unlocked: '🏆',
      quest_started: '📋',
      quest_completed: '✅',
      relationship_changed: '👥',
      location_changed: '📍',
      combat: '⚔️',
      choice_made: '🎯',
      intent_used: '🔮',
      spell_cast: '✨',
      craft: '⚗️',
      purchase: '🛒',
      sale: '💰',
      survival_change: '🍎',
      faction_change: '👑',
      journal_entry: '📖',
    };
    return icons[type] || '📝';
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="text-blue-400" />
              Database Manager
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: <Database className="w-4 h-4" /> },
            { id: 'changelog', label: 'Change Log', icon: <History className="w-4 h-4" /> },
            { id: 'statistics', label: 'Statistics', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'management', label: 'Management', icon: <RefreshCw className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" />
              <p className="text-gray-400">Loading...</p>
            </div>
          )}

          {!isLoading && activeTab === 'overview' && dbInfo && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{dbInfo.gameStates}</div>
                  <div className="text-sm text-gray-400 mt-1">Game States</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">{dbInfo.saveSlots}</div>
                  <div className="text-sm text-gray-400 mt-1">Save Slots</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-400">{dbInfo.achievements}</div>
                  <div className="text-sm text-gray-400 mt-1">Achievements</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">{dbInfo.changeLogEntries}</div>
                  <div className="text-sm text-gray-400 mt-1">Change Logs</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-cyan-400">{dbInfo.journalEntries}</div>
                  <div className="text-sm text-gray-400 mt-1">Journal Entries</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-pink-400">{dbInfo.visitedLocations}</div>
                  <div className="text-sm text-gray-400 mt-1">Locations Visited</div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h3 className="font-bold text-blue-300 mb-2">💡 About the Database</h3>
                <p className="text-sm text-gray-300">
                  This game uses IndexedDB, a powerful browser-based database that stores all your game data locally.
                  Unlike localStorage, IndexedDB can handle large amounts of data and provides better performance for complex queries.
                  All data stays on your device - nothing is sent to external servers.
                </p>
              </div>
            </div>
          )}

          {!isLoading && activeTab === 'changelog' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search changes..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {changeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Change Log List */}
              <div className="space-y-2">
                {filteredChangeLog.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No changes recorded yet.</p>
                  </div>
                ) : (
                  filteredChangeLog.map((entry) => (
                    <div key={entry.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getChangeTypeIcon(entry.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-white font-medium">{entry.description}</p>
                            <span className="text-xs text-gray-500">Turn {entry.turnNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                              {entry.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!isLoading && activeTab === 'statistics' && statistics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{statistics.totalTurns}</div>
                  <div className="text-sm text-gray-400">Total Turns</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{statistics.totalChoicesMade}</div>
                  <div className="text-sm text-gray-400">Choices Made</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">{statistics.totalIntentsUsed}</div>
                  <div className="text-sm text-gray-400">Intents Used</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400">{statistics.totalCombatEncounters}</div>
                  <div className="text-sm text-gray-400">Combat Encounters</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-400">{statistics.totalGoldEarned}g</div>
                  <div className="text-sm text-gray-400">Gold Earned</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">{statistics.totalXpGained}</div>
                  <div className="text-sm text-gray-400">XP Gained</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-400">{statistics.totalItemsGained}</div>
                  <div className="text-sm text-gray-400">Items Gained</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-pink-400">{statistics.totalSpellsCast}</div>
                  <div className="text-sm text-gray-400">Spells Cast</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-400">{statistics.totalLocationsVisited}</div>
                  <div className="text-sm text-gray-400">Locations Visited</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400">{statistics.totalDamageDealt}</div>
                  <div className="text-sm text-gray-400">Damage Dealt</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{statistics.totalHealingDone}</div>
                  <div className="text-sm text-gray-400">Healing Done</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-400">{statistics.totalDeaths}</div>
                  <div className="text-sm text-gray-400">Deaths</div>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="font-bold text-white mb-2">Play Time</h3>
                <div className="text-3xl font-bold text-blue-400">
                  {Math.floor(statistics.playTimeSeconds / 3600)}h {Math.floor((statistics.playTimeSeconds % 3600) / 60)}m
                </div>
              </div>
            </div>
          )}

          {!isLoading && activeTab === 'management' && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <h3 className="font-bold text-green-300 mb-2 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Database
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  Download a complete backup of all your game data as a JSON file.
                </p>
                <button
                  onClick={handleExport}
                  className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Export All Data
                </button>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h3 className="font-bold text-blue-300 mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Import Database
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  Restore your game data from a previously exported backup file.
                </p>
                <button
                  onClick={handleImport}
                  className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Import Data
                </button>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <h3 className="font-bold text-red-300 mb-2 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Clear All Data
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  Permanently delete all game data. This cannot be undone!
                </p>
                <button
                  onClick={handleClearAll}
                  className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
