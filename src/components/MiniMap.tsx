import { MapPin } from 'lucide-react';

interface MiniMapProps {
  currentLocation: string;
  visitedLocations: string[];
  totalLocations: number;
}

const LOCATION_ICONS: Record<string, string> = {
  'village': '🏘️',
  'forest': '🌲',
  'mountain': '⛰️',
  'dungeon': '🏰',
  'city': '🏛️',
  'ruins': '🗿',
  'tavern': '🍺',
  'market': '🏪',
  'temple': '⛪',
  'cave': '🕳️',
  'default': '📍',
};

function getLocationIcon(location: string): string {
  const lower = location.toLowerCase();
  for (const [key, icon] of Object.entries(LOCATION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return LOCATION_ICONS.default;
}

export default function MiniMap({ currentLocation, visitedLocations, totalLocations }: MiniMapProps) {
  const recentLocations = visitedLocations.slice(-5).reverse();
  const uniqueVisited = new Set(visitedLocations).size;
  const progress = (uniqueVisited / Math.max(1, totalLocations)) * 100;

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 flex items-center gap-3">
      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
      
      {/* Current Location */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{getLocationIcon(currentLocation)}</span>
          <span className="text-xs text-white font-medium truncate">{currentLocation}</span>
        </div>
        <div className="text-xs text-gray-500">
          {uniqueVisited}/{totalLocations} explored
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-0.5 shrink-0">
        {recentLocations.map((loc, i) => (
          <div
            key={`${loc}-${i}`}
            className={`w-1.5 h-1.5 rounded-full ${
              i === 0 ? 'bg-amber-400' : 'bg-gray-600'
            }`}
            title={loc}
          />
        ))}
      </div>
    </div>
  );
}
