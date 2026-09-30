import { useState } from 'react';
import { BookOpen, Plus, X, Calendar, MapPin } from 'lucide-react';

interface JournalEntry {
  id: string;
  timestamp: number;
  turnNumber: number;
  location: string;
  type: 'auto' | 'manual';
  title: string;
  content: string;
}

interface JournalProps {
  entries: JournalEntry[];
  onAddEntry: (title: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
  currentTurn: number;
  currentLocation: string;
}

export default function Journal({ entries, onAddEntry, onDeleteEntry, currentTurn, currentLocation }: JournalProps) {
  const [isWriting, setIsWriting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'auto' | 'manual'>('all');

  const handleAdd = () => {
    if (newTitle.trim() || newContent.trim()) {
      onAddEntry(
        newTitle.trim() || 'Untitled Entry',
        newContent.trim()
      );
      setNewTitle('');
      setNewContent('');
      setIsWriting(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    if (filter === 'all') return true;
    return e.type === filter;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/30 to-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="text-amber-400" />
            Personal Journal
          </h3>
          <button
            onClick={() => setIsWriting(!isWriting)}
            className="bg-amber-600 hover:bg-amber-500 text-white text-sm px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
          >
            {isWriting ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {isWriting ? 'Cancel' : 'Write'}
          </button>
        </div>
      </div>

      {/* Writing Area */}
      {isWriting && (
        <div className="p-4 border-b border-gray-700 bg-gray-900/50 space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Entry title..."
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your thoughts, observations, or plans..."
            rows={4}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Turn {currentTurn} · {currentLocation}
            </span>
            <button
              onClick={handleAdd}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm px-4 py-1.5 rounded-lg transition-all"
            >
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 p-3 border-b border-gray-700">
        {(['all', 'auto', 'manual'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              filter === f
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f === 'auto' ? '📋 Auto' : '✍️ Manual'}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="max-h-96 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No journal entries yet.</p>
            <p className="text-xs mt-1">Click "Write" to add your first entry.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-gray-800/30 transition-colors group">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      entry.type === 'auto' ? 'bg-blue-900/50 text-blue-300' : 'bg-amber-900/50 text-amber-300'
                    }`}>
                      {entry.type === 'auto' ? '📋' : '✍️'}
                    </span>
                    <h4 className="font-bold text-white text-sm">{entry.title}</h4>
                  </div>
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entry.timestamp)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {entry.location}
                  </span>
                  <span>Turn {entry.turnNumber}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type { JournalEntry };
