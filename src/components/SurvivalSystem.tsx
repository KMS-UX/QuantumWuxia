import { Apple, Droplets, Flame, Moon } from 'lucide-react';

export interface SurvivalStats {
  hunger: number; // 0-100, 100 = full
  thirst: number; // 0-100, 100 = hydrated
  energy: number; // 0-100, 100 = rested
  temperature: number; // 0-100, 50 = comfortable
}

interface SurvivalSystemProps {
  stats: SurvivalStats;
  onEat: () => void;
  onDrink: () => void;
  onRest: () => void;
}

export default function SurvivalSystem({ stats, onEat, onDrink, onRest }: SurvivalSystemProps) {
  const getStatusColor = (value: number): string => {
    if (value >= 75) return 'text-green-400';
    if (value >= 50) return 'text-yellow-400';
    if (value >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBarColor = (value: number): string => {
    if (value >= 75) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getWarning = (stat: string, value: number): string | null => {
    if (value < 25) {
      switch (stat) {
        case 'hunger': return '⚠️ Starving! Find food soon!';
        case 'thirst': return '⚠️ Dehydrated! Find water!';
        case 'energy': return '⚠️ Exhausted! Rest now!';
        case 'temperature': return value < 25 ? '⚠️ Freezing!' : '⚠️ Overheating!';
      }
    }
    return null;
  };

  const statsList = [
    {
      key: 'hunger',
      label: 'Hunger',
      value: stats.hunger,
      icon: <Apple className="w-4 h-4" />,
      action: onEat,
      actionLabel: 'Eat',
    },
    {
      key: 'thirst',
      label: 'Thirst',
      value: stats.thirst,
      icon: <Droplets className="w-4 h-4" />,
      action: onDrink,
      actionLabel: 'Drink',
    },
    {
      key: 'energy',
      label: 'Energy',
      value: stats.energy,
      icon: <Moon className="w-4 h-4" />,
      action: onRest,
      actionLabel: 'Rest',
    },
    {
      key: 'temperature',
      label: 'Comfort',
      value: stats.temperature,
      icon: <Flame className="w-4 h-4" />,
      action: null,
      actionLabel: null,
    },
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Apple className="text-green-400" />
        Survival
      </h3>

      <div className="space-y-3">
        {statsList.map((stat) => {
          const warning = getWarning(stat.key, stat.value);
          
          return (
            <div key={stat.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={getStatusColor(stat.value)}>{stat.icon}</span>
                  <span className="text-sm text-gray-300">{stat.label}</span>
                </div>
                <span className={`text-sm font-bold ${getStatusColor(stat.value)}`}>
                  {Math.round(stat.value)}%
                </span>
              </div>
              
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full transition-all ${getBarColor(stat.value)}`}
                  style={{ width: `${stat.value}%` }}
                />
              </div>

              {warning && (
                <div className="text-xs text-red-400 animate-pulse">{warning}</div>
              )}

              {stat.action && stat.value < 75 && (
                <button
                  onClick={stat.action}
                  className="mt-1 text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-all"
                >
                  {stat.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Effects */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-xs font-bold text-gray-400 mb-2">Status Effects</h4>
        <div className="flex flex-wrap gap-1">
          {stats.hunger < 25 && (
            <span className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded">
              🍖 Starving (-2 STR)
            </span>
          )}
          {stats.thirst < 25 && (
            <span className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded">
              💧 Dehydrated (-2 AGI)
            </span>
          )}
          {stats.energy < 25 && (
            <span className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded">
              😴 Exhausted (-2 INT)
            </span>
          )}
          {stats.temperature < 25 && (
            <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded">
              🥶 Freezing (-1 All)
            </span>
          )}
          {stats.temperature > 75 && (
            <span className="text-xs bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded">
              🥵 Overheating (-1 All)
            </span>
          )}
          {stats.hunger >= 75 && stats.thirst >= 75 && stats.energy >= 75 && (
            <span className="text-xs bg-green-900/30 text-green-300 px-2 py-0.5 rounded">
              ✨ Well Rested (+1 All)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
export function updateSurvivalStats(stats: SurvivalStats, turnsElapsed: number = 1): SurvivalStats {
  return {
    hunger: Math.max(0, stats.hunger - (turnsElapsed * 2)),
    thirst: Math.max(0, stats.thirst - (turnsElapsed * 3)),
    energy: Math.max(0, stats.energy - (turnsElapsed * 1.5)),
    temperature: stats.temperature, // Temperature changes based on weather/location
  };
}

export function eat(stats: SurvivalStats): SurvivalStats {
  return {
    ...stats,
    hunger: Math.min(100, stats.hunger + 30),
  };
}

export function drink(stats: SurvivalStats): SurvivalStats {
  return {
    ...stats,
    thirst: Math.min(100, stats.thirst + 40),
  };
}

export function rest(stats: SurvivalStats): SurvivalStats {
  return {
    ...stats,
    energy: Math.min(100, stats.energy + 50),
  };
}

export function getSurvivalPenalties(stats: SurvivalStats): {
  strengthMod: number;
  agilityMod: number;
  intelligenceMod: number;
} {
  let strengthMod = 0;
  let agilityMod = 0;
  let intelligenceMod = 0;

  if (stats.hunger < 25) strengthMod -= 2;
  if (stats.thirst < 25) agilityMod -= 2;
  if (stats.energy < 25) intelligenceMod -= 2;
  if (stats.temperature < 25 || stats.temperature > 75) {
    strengthMod -= 1;
    agilityMod -= 1;
    intelligenceMod -= 1;
  }

  if (stats.hunger >= 75 && stats.thirst >= 75 && stats.energy >= 75) {
    strengthMod += 1;
    agilityMod += 1;
    intelligenceMod += 1;
  }

  return { strengthMod, agilityMod, intelligenceMod };
}


