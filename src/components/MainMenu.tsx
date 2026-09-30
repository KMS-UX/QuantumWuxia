import { useState } from 'react';
import { Play, BookOpen, Settings as SettingsIcon, Trophy, Clock, Users, Database, Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../services/soundManager';

interface MainMenuProps {
  hasSaveData: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onLoadGame: () => void;
  onSettings: () => void;
  onAchievements: () => void;
  onDatabase: () => void;
  stats?: {
    totalPlayTime: number;
    totalGamesPlayed: number;
    highestLevel: number;
    totalAchievements: number;
  };
}

export default function MainMenu({ 
  hasSaveData, 
  onNewGame, 
  onContinue, 
  onLoadGame, 
  onSettings, 
  onAchievements,
  onDatabase,
  stats 
}: MainMenuProps) {
  const [showStats, setShowStats] = useState(false);
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();

  const formatPlayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4 animate-pulse">⚔️</div>
          <h1 className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-2">
            Realm of Echoes
          </h1>
          <p className="text-xl text-gray-400">An AI-Powered Text RPG Adventure</p>
          <p className="text-sm text-gray-500 mt-2">
            {soundEnabled ? '🔊' : '🔇'} Sound {soundEnabled ? 'On' : 'Off'}
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-3 mb-8">
          {hasSaveData && (
            <button
              onClick={onContinue}
              className="w-full group bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5" />
              Continue Adventure
              <span className="text-sm opacity-75">→</span>
            </button>
          )}

          <button
            onClick={onNewGame}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-3"
          >
            <BookOpen className="w-5 h-5" />
            New Adventure
          </button>

          <button
            onClick={onLoadGame}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <Database className="w-5 h-5" />
            Load Game
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <button
            onClick={onSettings}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-xl p-4 transition-all text-center group"
          >
            <SettingsIcon className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-amber-400 transition-colors" />
            <div className="text-sm text-gray-300">Settings</div>
          </button>

          <button
            onClick={onAchievements}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-xl p-4 transition-all text-center group"
          >
            <Trophy className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-amber-400 transition-colors" />
            <div className="text-sm text-gray-300">Achievements</div>
          </button>

          <button
            onClick={onDatabase}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-xl p-4 transition-all text-center group"
          >
            <Database className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-amber-400 transition-colors" />
            <div className="text-sm text-gray-300">Database</div>
          </button>

          <button
            onClick={toggleSound}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-xl p-4 transition-all text-center group"
          >
            {soundEnabled ? (
              <Volume2 className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-amber-400 transition-colors" />
            ) : (
              <VolumeX className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-amber-400 transition-colors" />
            )}
            <div className="text-sm text-gray-300">{soundEnabled ? 'Sound On' : 'Sound Off'}</div>
          </button>
        </div>

        {/* Stats Display */}
        {stats && (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
            <button
              onClick={() => setShowStats(!showStats)}
              className="w-full flex items-center justify-between text-sm"
            >
              <span className="text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Your Journey
              </span>
              <span className="text-gray-500">{showStats ? '▼' : '▶'}</span>
            </button>
            
            {showStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{formatPlayTime(stats.totalPlayTime)}</div>
                  <div className="text-xs text-gray-500">Play Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.totalGamesPlayed}</div>
                  <div className="text-xs text-gray-500">Games Played</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">Lv.{stats.highestLevel}</div>
                  <div className="text-xs text-gray-500">Highest Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.totalAchievements}</div>
                  <div className="text-xs text-gray-500">Achievements</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-600">
          <p>Realm of Echoes v2.0 • AI-Powered Text RPG</p>
          <p className="mt-1">Supports OpenAI, Ollama, LM Studio, and custom endpoints</p>
        </div>
      </div>
    </div>
  );
}
