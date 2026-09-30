import { useState } from 'react';
import { Book, Search, Filter } from 'lucide-react';

export interface LoreEntry {
  id: string;
  title: string;
  category: 'location' | 'character' | 'item' | 'creature' | 'faction' | 'event' | 'spell' | 'history';
  content: string;
  discoveredAt: number;
  turnDiscovered: number;
  icon: string;
  tags: string[];
}

interface LoreCodexProps {
  entries: LoreEntry[];
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  location: { icon: '📍', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700/50' },
  character: { icon: '👤', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-700/50' },
  item: { icon: '🎒', color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700/50' },
  creature: { icon: '🐉', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700/50' },
  faction: { icon: '👥', color: 'text-pink-400', bg: 'bg-pink-900/30', border: 'border-pink-700/50' },
  event: { icon: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-700/50' },
  spell: { icon: '✨', color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-700/50' },
  history: { icon: '📜', color: 'text-gray-400', bg: 'bg-gray-900/30', border: 'border-gray-700/50' },
};

export default function LoreCodex({ entries }: LoreCodexProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null);

  const categories = ['all', 'location', 'character', 'item', 'creature', 'faction', 'event', 'spell', 'history'];

  const filteredEntries = entries.filter(entry => {
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = cat === 'all' ? entries.length : entries.filter(e => e.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/30 to-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Book className="text-amber-400" />
            Lore Codex
          </h3>
          <span className="text-sm text-gray-400">{entries.length} entries</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the codex..."
            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-3 border-b border-gray-700 overflow-x-auto">
        {categories.map((cat) => {
          const config = cat === 'all' ? null : CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {config && <span>{config.icon}</span>}
              <span className="capitalize">{cat}</span>
              <span className="text-xs opacity-70">({categoryCounts[cat]})</span>
            </button>
          );
        })}
      </div>

      {/* Entries List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Book className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {entries.length === 0 ? 'No lore discovered yet.' : 'No entries match your search.'}
            </p>
            <p className="text-xs mt-1">Explore the world to uncover its secrets.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredEntries.map((entry) => {
              const config = CATEGORY_CONFIG[entry.category];
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full p-3 hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{entry.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm truncate">{entry.title}</h4>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{entry.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>Turn {entry.turnDiscovered}</span>
                        {entry.tags.length > 0 && (
                          <span>• {entry.tags.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">{selectedEntry.icon}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{selectedEntry.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_CONFIG[selectedEntry.category].bg} ${CATEGORY_CONFIG[selectedEntry.category].color}`}>
                      {selectedEntry.category}
                    </span>
                    <span className="text-xs text-gray-500">Turn {selectedEntry.turnDiscovered}</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedEntry.content}</p>

              {selectedEntry.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="text-xs font-bold text-gray-400 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedEntry(null)}
                className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
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

// Helper to add lore entries from game events
export function createLoreEntry(
  title: string,
  category: LoreEntry['category'],
  content: string,
  icon: string,
  turnNumber: number,
  tags: string[] = []
): LoreEntry {
  return {
    id: `lore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    category,
    content,
    discoveredAt: Date.now(),
    turnDiscovered: turnNumber,
    icon,
    tags,
  };
}


