import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';

interface DayNightCycleProps {
  turnCount: number;
}

type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

function getTimeOfDay(turnCount: number): TimeOfDay {
  // Each "day" is 8 turns
  const cyclePosition = turnCount % 8;
  
  if (cyclePosition < 2) return 'dawn';
  if (cyclePosition < 5) return 'day';
  if (cyclePosition < 7) return 'dusk';
  return 'night';
}

function getDayNumber(turnCount: number): number {
  return Math.floor(turnCount / 8) + 1;
}

function getTimeString(time: TimeOfDay): string {
  switch (time) {
    case 'dawn': return 'Dawn';
    case 'day': return 'Day';
    case 'dusk': return 'Dusk';
    case 'night': return 'Night';
  }
}

function getBackgroundGradient(time: TimeOfDay): string {
  switch (time) {
    case 'dawn': return 'from-orange-900/20 to-yellow-900/20';
    case 'day': return 'from-blue-900/20 to-cyan-900/20';
    case 'dusk': return 'from-purple-900/20 to-red-900/20';
    case 'night': return 'from-indigo-900/30 to-gray-900/30';
  }
}

function getIcon(time: TimeOfDay) {
  switch (time) {
    case 'dawn': return <Sunrise className="w-4 h-4 text-orange-400" />;
    case 'day': return <Sun className="w-4 h-4 text-yellow-400" />;
    case 'dusk': return <Sunset className="w-4 h-4 text-purple-400" />;
    case 'night': return <Moon className="w-4 h-4 text-indigo-400" />;
  }
}

export default function DayNightCycle({ turnCount }: DayNightCycleProps) {
  const timeOfDay = getTimeOfDay(turnCount);
  const dayNumber = getDayNumber(turnCount);
  const timeString = getTimeString(timeOfDay);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getBackgroundGradient(timeOfDay)} border border-gray-700/50`}>
      {getIcon(timeOfDay)}
      <span className="text-xs text-gray-300">
        Day {dayNumber} · {timeString}
      </span>
    </div>
  );
}
