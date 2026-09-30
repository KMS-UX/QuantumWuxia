import { Achievement } from '../types/game';
import { Trophy, Lock, Unlock } from 'lucide-react';

interface AchievementsProps {
  achievements: Achievement[];
}

export default function Achievements({ achievements }: AchievementsProps) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="text-amber-400" /> Achievements
        </h3>
        <span className="text-sm text-gray-400">
          {unlockedCount}/{totalCount}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative p-3 rounded-lg border-2 transition-all ${
              achievement.unlocked
                ? 'border-amber-500/50 bg-amber-900/20'
                : 'border-gray-700 bg-gray-900/30 opacity-60'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="text-2xl">{achievement.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate">
                  {achievement.name}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {achievement.description}
                </div>
                {achievement.unlocked && achievement.unlockedAt && (
                  <div className="text-xs text-amber-400 mt-1">
                    ✓ Unlocked
                  </div>
                )}
              </div>
              {!achievement.unlocked && (
                <Lock className="w-4 h-4 text-gray-500 shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {unlockedCount === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Keep playing to unlock achievements!</p>
        </div>
      )}
    </div>
  );
}

// Default achievements
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Win your first combat',
    icon: '⚔️',
    unlocked: false,
  },
  {
    id: 'treasure-hunter',
    name: 'Treasure Hunter',
    description: 'Collect 100 gold',
    icon: '💰',
    unlocked: false,
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive 10 turns',
    icon: '🛡️',
    unlocked: false,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Visit 5 different locations',
    icon: '🗺️',
    unlocked: false,
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Meet 3 different NPCs',
    icon: '👥',
    unlocked: false,
  },
  {
    id: 'level-up',
    name: 'Level Up!',
    description: 'Reach level 2',
    icon: '⭐',
    unlocked: false,
  },
  {
    id: 'master-collector',
    name: 'Master Collector',
    description: 'Collect 10 different items',
    icon: '🎒',
    unlocked: false,
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Use Intent 5 times',
    icon: '📖',
    unlocked: false,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Complete 50 turns',
    icon: '🏆',
    unlocked: false,
  },
];
