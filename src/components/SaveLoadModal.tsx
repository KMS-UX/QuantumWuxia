import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SaveSlot } from '../types/game';
import { Save, Download, Trash2, X, Clock, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface SaveLoadModalProps {
  onClose: () => void;
  initialMode?: 'save' | 'load';
  allowSave?: boolean;
  onLoaded?: () => void;
  themeWuxia?: boolean;
}

export default function SaveLoadModal({ onClose, initialMode = 'save', allowSave = true, onLoaded, themeWuxia = false }: SaveLoadModalProps) {
  const { gameState, settings, saveGame, loadGame, deleteSave, saveSlots } = useGameStore();
  const [saveName, setSaveName] = useState('');
  const [mode, setMode] = useState<'save' | 'load'>(initialMode);
  const wuxiaTheme = themeWuxia || Boolean(gameState.character?.originId);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveGame(saveName.trim());
    setSaveName('');
    onClose();
  };

  const handleLoad = (slot: SaveSlot) => {
    loadGame(slot.id);
    onClose();
    onLoaded?.();
  };

  const handleDelete = (slotId: string) => {
    if (confirm('Are you sure you want to delete this save?')) {
      deleteSave(slotId);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${wuxiaTheme ? 'jianghu-modal-scrim' : 'bg-black/70'}`}>
      <div className={`max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col ${wuxiaTheme ? 'jianghu-modal' : 'rounded-2xl border border-gray-700 bg-gray-900'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex gap-2">
            {allowSave && (
              <button
                onClick={() => setMode('save')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  mode === 'save' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Save journey
              </button>
            )}
            <button
              onClick={() => setMode('load')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                mode === 'load' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Load journey
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'save' && allowSave && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Save Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Enter a name for this save..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
              
              {gameState.character && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400 mb-2">Current Progress:</div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4 text-amber-400" />
                      <span className="text-white">{gameState.character.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="text-white">{gameState.location}</span>
                    </div>
                    <div className="text-gray-400">
                      Turn {gameState.turnCount}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Game
              </button>
            </div>
          )}

          {mode === 'load' && (
            <div className="space-y-3">
              {saveSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Save className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No saved games found.</p>
                  <p className="text-sm mt-2">Create a save from the game screen.</p>
                </div>
              ) : (
                saveSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-amber-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-white">{slot.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(slot.timestamp), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {slot.characterName}{slot.gameState.character?.originId ? ` · ${slot.gameState.character.class}` : ` (Lv.${slot.characterLevel})`}
                          </span>
                          <span>Turn {slot.turnCount} · {slot.gameState.location}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleLoad(slot)}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition-all"
                    >
                      <Download className="w-3 h-3 inline mr-1" />
                      Load This Save
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
