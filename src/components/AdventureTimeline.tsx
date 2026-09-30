import { useState } from 'react';
import { GitBranch, Filter } from 'lucide-react';
import { ChangeLogEntry } from '../services/database';

interface AdventureTimelineProps {
  entries: ChangeLogEntry[];
  currentTurn: number;
}

const EVENT_ICONS: Record<string, string> = {
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

const EVENT_COLORS: Record<string, string> = {
  state_change: 'bg-blue-500',
  item_gained: 'bg-green-500',
  item_lost: 'bg-red-500',
  level_up: 'bg-amber-500',
  achievement_unlocked: 'bg-purple-500',
  quest_started: 'bg-cyan-500',
  quest_completed: 'bg-emerald-500',
  relationship_changed: 'bg-pink-500',
  location_changed: 'bg-indigo-500',
  combat: 'bg-red-600',
  choice_made: 'bg-gray-500',
  intent_used: 'bg-purple-400',
  spell_cast: 'bg-cyan-400',
  craft: 'bg-orange-500',
  purchase: 'bg-yellow-500',
  sale: 'bg-yellow-600',
  survival_change: 'bg-lime-500',
  faction_change: 'bg-fuchsia-500',
  journal_entry: 'bg-slate-500',
};

export default function AdventureTimeline({ entries, currentTurn }: AdventureTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'milestones' | 'combat' | 'items' | 'social'>('all');

  // Group entries by turn
  const groupedByTurn = entries.reduce((acc, entry) => {
    if (!acc[entry.turnNumber]) acc[entry.turnNumber] = [];
    acc[entry.turnNumber].push(entry);
    return acc;
  }, {} as Record<number, ChangeLogEntry[]>);

  const turns = Object.keys(groupedByTurn)
    .map(Number)
    .sort((a, b) => b - a); // Most recent first

  // Filter entries
  const getFilteredEntries = (turnEntries: ChangeLogEntry[]) => {
    if (filter === 'all') return turnEntries;
    if (filter === 'milestones') {
      return turnEntries.filter(e => 
        ['level_up', 'achievement_unlocked', 'quest_completed', 'quest_started'].includes(e.type)
      );
    }
    if (filter === 'combat') {
      return turnEntries.filter(e => e.type === 'combat');
    }
    if (filter === 'items') {
      return turnEntries.filter(e => 
        ['item_gained', 'item_lost', 'craft', 'purchase', 'sale'].includes(e.type)
      );
    }
    if (filter === 'social') {
      return turnEntries.filter(e => 
        ['relationship_changed', 'faction_change'].includes(e.type)
      );
    }
    return turnEntries;
  };

  const filters = [
    { id: 'all', label: 'All', icon: '📜' },
    { id: 'milestones', label: 'Milestones', icon: '⭐' },
    { id: 'combat', label: 'Combat', icon: '⚔️' },
    { id: 'items', label: 'Items', icon: '🎒' },
    { id: 'social', label: 'Social', icon: '👥' },
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <GitBranch className="text-indigo-400" />
            Adventure Timeline
          </h3>
          <span className="text-sm text-gray-400">{entries.length} events</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-3 border-b border-gray-700 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="max-h-96 overflow-y-auto p-4">
        {turns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events recorded yet.</p>
            <p className="text-xs mt-1">Your adventure timeline will appear here.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

            {turns.map((turn) => {
              const turnEntries = getFilteredEntries(groupedByTurn[turn]);
              if (turnEntries.length === 0) return null;

              const isCurrent = turn === currentTurn;

              return (
                <div key={turn} className="relative pl-10 pb-4">
                  {/* Turn marker */}
                  <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? 'bg-amber-500 border-amber-400 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-400'
                  }`}>
                    {turn}
                  </div>

                  {/* Turn label */}
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className={`font-bold ${isCurrent ? 'text-amber-400' : 'text-gray-300'}`}>
                      Turn {turn}
                    </h4>
                    {isCurrent && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(turnEntries[0].timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-1.5">
                    {turnEntries.map((entry, i) => (
                      <div
                        key={entry.id || i}
                        className="flex items-start gap-2 text-sm bg-gray-900/50 rounded-lg p-2 border border-gray-700/50"
                      >
                        <div className="text-lg shrink-0">{EVENT_ICONS[entry.type] || '📝'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-xs">{entry.description}</p>
                          {entry.details && Object.keys(entry.details).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(entry.details).slice(0, 3).map(([key, value]) => (
                                <span key={key} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
