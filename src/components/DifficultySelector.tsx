import { Settings, Shield, Skull, Sparkles } from 'lucide-react';

export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'nightmare';

interface DifficultySettings {
  level: DifficultyLevel;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  xpMultiplier: number;
  goldMultiplier: number;
  healingMultiplier: number;
  description: string;
  icon: string;
  color: string;
}

export const DIFFICULTY_SETTINGS: Record<DifficultyLevel, DifficultySettings> = {
  easy: {
    level: 'easy',
    enemyHpMultiplier: 0.7,
    enemyDamageMultiplier: 0.7,
    xpMultiplier: 0.8,
    goldMultiplier: 1.2,
    healingMultiplier: 1.5,
    description: 'For those who want to enjoy the story without too much challenge',
    icon: '🌱',
    color: 'from-green-600 to-green-500',
  },
  normal: {
    level: 'normal',
    enemyHpMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    xpMultiplier: 1.0,
    goldMultiplier: 1.0,
    healingMultiplier: 1.0,
    description: 'The intended experience with balanced challenge',
    icon: '⚔️',
    color: 'from-blue-600 to-blue-500',
  },
  hard: {
    level: 'hard',
    enemyHpMultiplier: 1.5,
    enemyDamageMultiplier: 1.3,
    xpMultiplier: 1.3,
    goldMultiplier: 1.3,
    healingMultiplier: 0.7,
    description: 'For veterans seeking a true test of skill',
    icon: '🔥',
    color: 'from-orange-600 to-orange-500',
  },
  nightmare: {
    level: 'nightmare',
    enemyHpMultiplier: 2.0,
    enemyDamageMultiplier: 1.8,
    xpMultiplier: 2.0,
    goldMultiplier: 2.0,
    healingMultiplier: 0.5,
    description: 'Only for the bravest souls. Death lurks around every corner',
    icon: '💀',
    color: 'from-red-700 to-red-600',
  },
};

interface DifficultySelectorProps {
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
}

export default function DifficultySelector({ currentDifficulty, onDifficultyChange }: DifficultySelectorProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Settings className="text-amber-400" />
        Difficulty
      </h3>

      <div className="space-y-3">
        {(Object.keys(DIFFICULTY_SETTINGS) as DifficultyLevel[]).map((level) => {
          const settings = DIFFICULTY_SETTINGS[level];
          const isSelected = currentDifficulty === level;

          return (
            <button
              key={level}
              onClick={() => onDifficultyChange(level)}
              className={`w-full border-2 rounded-lg p-4 text-left transition-all ${
                isSelected
                  ? `border-amber-500 bg-gradient-to-r ${settings.color} bg-opacity-20`
                  : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{settings.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white capitalize">{level}</h4>
                    {isSelected && (
                      <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{settings.description}</p>
                  
                  {/* Multipliers */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Enemy HP:</span>
                      <span className={settings.enemyHpMultiplier > 1 ? 'text-red-400' : settings.enemyHpMultiplier < 1 ? 'text-green-400' : 'text-white'}>
                        {Math.round(settings.enemyHpMultiplier * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Enemy Damage:</span>
                      <span className={settings.enemyDamageMultiplier > 1 ? 'text-red-400' : settings.enemyDamageMultiplier < 1 ? 'text-green-400' : 'text-white'}>
                        {Math.round(settings.enemyDamageMultiplier * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">XP Gain:</span>
                      <span className={settings.xpMultiplier > 1 ? 'text-green-400' : settings.xpMultiplier < 1 ? 'text-red-400' : 'text-white'}>
                        {Math.round(settings.xpMultiplier * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gold Gain:</span>
                      <span className={settings.goldMultiplier > 1 ? 'text-green-400' : settings.goldMultiplier < 1 ? 'text-red-400' : 'text-white'}>
                        {Math.round(settings.goldMultiplier * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Healing:</span>
                      <span className={settings.healingMultiplier > 1 ? 'text-green-400' : settings.healingMultiplier < 1 ? 'text-red-400' : 'text-white'}>
                        {Math.round(settings.healingMultiplier * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
        <p className="text-xs text-amber-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Difficulty affects combat balance and rewards. You can change this at any time from the settings menu.</span>
        </p>
      </div>
    </div>
  );
}

export type { DifficultySettings };
