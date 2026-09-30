import { useState } from 'react';
import { BookOpen, Skull, Trophy } from 'lucide-react';

export interface BestiaryEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
  hp: number;
  attack: number;
  defense: number;
  weaknesses: string[];
  resistances: string[];
  encounters: number;
  defeats: number;
  firstEncounter: number;
  lastEncounter: number;
  notes: string;
  loot: string[];
}

interface BestiaryProps {
  entries: BestiaryEntry[];
}

export default function Bestiary({ entries }: BestiaryProps) {
  const [selectedEntry, setSelectedEntry] = useState<BestiaryEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'boss'>('all');

  const filteredEntries = filter === 'all' 
    ? entries 
    : entries.filter(e => e.difficulty === filter);

  const totalEncounters = entries.reduce((sum, e) => sum + e.encounters, 0);
  const totalDefeats = entries.reduce((sum, e) => sum + e.defeats, 0);

  const difficultyColors = {
    easy: 'text-green-400 border-green-700/50 bg-green-900/10',
    medium: 'text-yellow-400 border-yellow-700/50 bg-yellow-900/10',
    hard: 'text-red-400 border-red-700/50 bg-red-900/10',
    boss: 'text-purple-400 border-purple-700/50 bg-purple-900/10',
  };

  const difficultyIcons = {
    easy: '💀',
    medium: '💀💀',
    hard: '💀💀💀',
    boss: '👑💀',
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="text-red-400" />
          Bestiary
        </h3>
        <div className="text-sm text-gray-400">
          {entries.length} creatures
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{totalEncounters}</div>
          <div className="text-xs text-gray-400">Total Encounters</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{totalDefeats}</div>
          <div className="text-xs text-gray-400">Victories</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {(['all', 'easy', 'medium', 'hard', 'boss'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Entries Grid */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Skull className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No creatures encountered yet.</p>
          <p className="text-xs mt-1">Explore the world to discover new foes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className={`border rounded-lg p-3 cursor-pointer transition-all hover:scale-105 ${difficultyColors[entry.difficulty]}`}
            >
              <div className="text-center">
                <div className="text-3xl mb-1">{entry.icon}</div>
                <div className="font-bold text-white text-sm">{entry.name}</div>
                <div className="text-xs mt-1">{difficultyIcons[entry.difficulty]}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {entry.encounters} encounters
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-6xl">{selectedEntry.icon}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{selectedEntry.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm ${difficultyColors[selectedEntry.difficulty].split(' ')[0]}`}>
                      {selectedEntry.difficulty.toUpperCase()}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm text-gray-400">{difficultyIcons[selectedEntry.difficulty]}</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-300 mb-4">{selectedEntry.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-400">{selectedEntry.hp}</div>
                  <div className="text-xs text-gray-400">HP</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-orange-400">{selectedEntry.attack}</div>
                  <div className="text-xs text-gray-400">Attack</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-400">{selectedEntry.defense}</div>
                  <div className="text-xs text-gray-400">Defense</div>
                </div>
              </div>

              {/* Weaknesses & Resistances */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-green-400 mb-2">Weaknesses</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.weaknesses.map((w, i) => (
                      <span key={i} className="text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-400 mb-2">Resistances</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.resistances.map((r, i) => (
                      <span key={i} className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Combat Record */}
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Combat Record
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Encounters:</span>
                    <span className="text-white ml-2 font-bold">{selectedEntry.encounters}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Victories:</span>
                    <span className="text-green-400 ml-2 font-bold">{selectedEntry.defeats}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-amber-400 ml-2 font-bold">
                      {selectedEntry.encounters > 0 
                        ? Math.round((selectedEntry.defeats / selectedEntry.encounters) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">First Seen:</span>
                    <span className="text-white ml-2">Turn {selectedEntry.firstEncounter}</span>
                  </div>
                </div>
              </div>

              {/* Loot */}
              {selectedEntry.loot.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-yellow-400 mb-2">Known Loot</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.loot.map((l, i) => (
                      <span key={i} className="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedEntry.notes && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <h4 className="text-sm font-bold text-gray-400 mb-1">Notes</h4>
                  <p className="text-sm text-gray-300 italic">{selectedEntry.notes}</p>
                </div>
              )}

              <button
                onClick={() => setSelectedEntry(null)}
                className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


