import { Users, TrendingUp, TrendingDown } from 'lucide-react';

export interface Faction {
  id: string;
  name: string;
  description: string;
  icon: string;
  reputation: number; // -100 to 100
  tier: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'honored' | 'exalted';
  benefits: string[];
  color: string;
}

function getFactionTier(reputation: number): Faction['tier'] {
  if (reputation <= -75) return 'hostile';
  if (reputation <= -25) return 'unfriendly';
  if (reputation < 25) return 'neutral';
  if (reputation < 50) return 'friendly';
  if (reputation < 75) return 'honored';
  return 'exalted';
}

function getFactionColor(tier: Faction['tier']): string {
  switch (tier) {
    case 'hostile': return 'text-red-500';
    case 'unfriendly': return 'text-orange-500';
    case 'neutral': return 'text-gray-400';
    case 'friendly': return 'text-blue-400';
    case 'honored': return 'text-purple-400';
    case 'exalted': return 'text-amber-400';
  }
}

interface FactionSystemProps {
  factions: Faction[];
}

export default function FactionSystem({ factions }: FactionSystemProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Users className="text-purple-400" />
        Factions
      </h3>

      <div className="space-y-3">
        {factions.map((faction) => {
          const tier = getFactionTier(faction.reputation);
          const color = getFactionColor(tier);
          const progress = (faction.reputation + 100) / 2; // Convert -100-100 to 0-200, then to 0-100%

          return (
            <div key={faction.id} className="border border-gray-700 rounded-lg p-3 bg-gray-900/30">
              <div className="flex items-start gap-3 mb-2">
                <div className="text-3xl">{faction.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">{faction.name}</h4>
                    <span className={`text-xs font-bold uppercase ${color}`}>
                      {tier}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{faction.description}</p>
                </div>
              </div>

              {/* Reputation Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Reputation</span>
                  <span className={color}>{faction.reputation}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-500" />
                  <div
                    className={`h-full transition-all ${
                      faction.reputation >= 0
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                        : 'bg-gradient-to-r from-red-500 to-orange-500'
                    }`}
                    style={{
                      width: `${Math.abs(faction.reputation) / 2}%`,
                      marginLeft: faction.reputation >= 0 ? '50%' : `${50 - Math.abs(faction.reputation) / 2}%`,
                    }}
                  />
                </div>
              </div>

              {/* Benefits */}
              {faction.reputation >= 25 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Benefits:</div>
                  <div className="flex flex-wrap gap-1">
                    {faction.benefits.slice(0, 3).map((benefit, i) => (
                      <span key={i} className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded">
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {factions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No factions discovered yet.</p>
          <p className="text-xs mt-1">Explore the world to encounter different factions.</p>
        </div>
      )}
    </div>
  );
}

// Helper functions
export function updateFactionReputation(factions: Faction[], factionId: string, change: number): Faction[] {
  return factions.map(f => {
    if (f.id === factionId) {
      const newRep = Math.max(-100, Math.min(100, f.reputation + change));
      return { ...f, reputation: newRep, tier: getFactionTier(newRep) };
    }
    return f;
  });
}

export function createFaction(id: string, name: string, description: string, icon: string, benefits: string[]): Faction {
  return {
    id,
    name,
    description,
    icon,
    reputation: 0,
    tier: 'neutral',
    benefits,
    color: 'gray',
  };
}

export { getFactionTier, getFactionColor };
