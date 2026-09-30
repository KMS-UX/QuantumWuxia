import { useState } from 'react';
import { Skull, RotateCcw, Heart, BookOpen } from 'lucide-react';

interface DeathScreenProps {
  characterName: string;
  level: number;
  turnsSurvived: number;
  onRespawn: (option: 'continue' | 'loadSave' | 'newGame') => void;
  hasSaves: boolean;
}

export default function DeathScreen({ characterName, level, turnsSurvived, onRespawn, hasSaves }: DeathScreenProps) {
  const [showOptions, setShowOptions] = useState(false);

  const deathQuotes = [
    "Every ending is a new beginning...",
    "The realm remembers your sacrifice.",
    "Death is but a doorway to another path.",
    "Your story need not end here.",
    "The echoes of your deeds linger on.",
    "Even heroes must rest sometimes.",
    "The realm weeps for its fallen champion.",
    "From ashes, new strength is born.",
  ];

  const randomQuote = deathQuotes[Math.floor(Math.random() * deathQuotes.length)];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Blood vignette effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-red-900/30 pointer-events-none" />
      
      <div className="relative max-w-lg w-full mx-4 text-center">
        {/* Skull Icon */}
        <div className="mb-6 relative">
          <div className="text-8xl animate-pulse">💀</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-red-500 mb-2 tracking-wider">
          YOU HAVE FALLEN
        </h1>
        
        <p className="text-gray-400 italic mb-8">
          "{randomQuote}"
        </p>

        {/* Stats Summary */}
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{characterName}</div>
              <div className="text-xs text-gray-500">Hero</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">Level {level}</div>
              <div className="text-xs text-gray-500">Reached</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{turnsSurvived}</div>
              <div className="text-xs text-gray-500">Turns Survived</div>
            </div>
          </div>
        </div>

        {/* Options */}
        {!showOptions ? (
          <button
            onClick={() => setShowOptions(true)}
            className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5 inline mr-2" />
            Continue...
          </button>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <button
              onClick={() => onRespawn('continue')}
              className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5" />
              Revive (Lose 50% Gold)
            </button>
            
            {hasSaves && (
              <button
                onClick={() => onRespawn('loadSave')}
                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Load Last Save
              </button>
            )}
            
            <button
              onClick={() => onRespawn('newGame')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Skull className="w-5 h-5" />
              Start New Adventure
            </button>
          </div>
        )}

        {/* Flavor text */}
        <p className="text-xs text-gray-600 mt-8">
          Your journey has ended, but the realm endures...
        </p>
      </div>
    </div>
  );
}
