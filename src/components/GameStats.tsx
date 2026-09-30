import { GameState } from '../types/game';
import { BarChart3, Clock, Footprints, Swords, MessageSquare, Trophy } from 'lucide-react';

interface GameStatsProps {
  gameState: GameState;
  sessionStartTime: number;
}

export default function GameStats({ gameState, sessionStartTime }: GameStatsProps) {
  const character = gameState.character;
  if (!character) return null;

  const playTime = Math.floor((Date.now() - sessionStartTime) / 1000 / 60); // minutes
  const totalChoices = gameState.turns.length;
  const intentCount = gameState.turns.filter(t => t.isIntent).length;
  const choiceCount = totalChoices - intentCount;
  const avgChoiceLength = gameState.turns.reduce((sum, t) => sum + (t.playerAction?.length || 0), 0) / Math.max(1, totalChoices);
  const locationsVisited = new Set(gameState.turns.map(t => t.narrative.match(/location: ([^\n]+)/i)?.[1]).filter(Boolean)).size;
  
  // Combat stats (estimated from narrative)
  const combatMentions = gameState.turns.filter(t => 
    t.narrative.toLowerCase().includes('combat') || 
    t.narrative.toLowerCase().includes('fight') ||
    t.narrative.toLowerCase().includes('battle')
  ).length;

  const stats = [
    {
      icon: <Clock className="w-5 h-5 text-blue-400" />,
      label: 'Play Time',
      value: `${playTime}m`,
      color: 'text-blue-400',
    },
    {
      icon: <Footprints className="w-5 h-5 text-green-400" />,
      label: 'Total Turns',
      value: gameState.turnCount.toString(),
      color: 'text-green-400',
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-purple-400" />,
      label: 'Intents Used',
      value: intentCount.toString(),
      color: 'text-purple-400',
    },
    {
      icon: <Swords className="w-5 h-5 text-red-400" />,
      label: 'Choices Made',
      value: choiceCount.toString(),
      color: 'text-red-400',
    },
    {
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      label: 'Level Reached',
      value: character.level.toString(),
      color: 'text-amber-400',
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-pink-400" />,
      label: 'Items Collected',
      value: character.inventory.length.toString(),
      color: 'text-pink-400',
    },
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <BarChart3 className="text-amber-400" />
        Game Statistics
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-gray-900/50 border border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              {stat.icon}
              <span className="text-xs text-gray-400">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Insights */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-bold text-gray-400 mb-2">Insights</h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex justify-between">
            <span>Avg. Action Length:</span>
            <span className="text-white">{Math.round(avgChoiceLength)} chars</span>
          </div>
          <div className="flex justify-between">
            <span>Intent vs Choice Ratio:</span>
            <span className="text-white">
              {totalChoices > 0 ? `${Math.round((intentCount / totalChoices) * 100)}% / ${Math.round((choiceCount / totalChoices) * 100)}%` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Combat Encounters:</span>
            <span className="text-white">~{combatMentions}</span>
          </div>
          <div className="flex justify-between">
            <span>Gold Earned:</span>
            <span className="text-yellow-400">{character.gold}g</span>
          </div>
        </div>
      </div>

      {/* Playstyle Analysis */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-bold text-gray-400 mb-2">Playstyle</h4>
        <div className="text-sm text-gray-300">
          {intentCount > choiceCount ? (
            <p className="flex items-center gap-2">
              <span className="text-purple-400">🔮</span>
              <span>Creative Explorer - You prefer writing your own actions!</span>
            </p>
          ) : intentCount < choiceCount / 2 ? (
            <p className="flex items-center gap-2">
              <span className="text-blue-400">🎯</span>
              <span>Strategic Thinker - You carefully consider your options.</span>
            </p>
          ) : (
            <p className="flex items-center gap-2">
              <span className="text-green-400">⚖️</span>
              <span>Balanced Adventurer - You mix choices and custom actions.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
