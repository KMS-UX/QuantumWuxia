import { useState } from 'react';
import { MapPin, Compass } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'village' | 'forest' | 'mountain' | 'dungeon' | 'city' | 'ruins';
  discovered: boolean;
  current?: boolean;
}

interface WorldMapProps {
  locations: Location[];
  currentLocation: string;
  onLocationClick?: (location: Location) => void;
}

const LOCATION_ICONS: Record<string, string> = {
  village: '🏘️',
  forest: '🌲',
  mountain: '⛰️',
  dungeon: '🏰',
  city: '🏛️',
  ruins: '🗿',
};

export default function WorldMap({ locations, currentLocation, onLocationClick }: WorldMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Compass className="text-amber-400" />
          World Map
        </h3>
        <div className="text-xs text-gray-400">
          {locations.filter(l => l.discovered).length} / {locations.length} discovered
        </div>
      </div>

      {/* Map Container */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 overflow-hidden" style={{ height: '300px' }}>
        {/* Grid Background */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connections between locations */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {locations.filter(l => l.discovered).map((loc, i) => {
            const nextLoc = locations.filter(l => l.discovered)[(i + 1) % locations.filter(l => l.discovered).length];
            if (!nextLoc || nextLoc.id === loc.id) return null;
            
            const distance = Math.sqrt(
              Math.pow(loc.x - nextLoc.x, 2) + Math.pow(loc.y - nextLoc.y, 2)
            );
            
            if (distance > 40) return null;
            
            return (
              <line
                key={`${loc.id}-${nextLoc.id}`}
                x1={`${loc.x}%`}
                y1={`${loc.y}%`}
                x2={`${nextLoc.x}%`}
                y2={`${nextLoc.y}%`}
                stroke="rgba(245, 158, 11, 0.3)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            );
          })}
        </svg>

        {/* Location Markers */}
        {locations.map((location) => (
          <div
            key={location.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer ${
              location.discovered ? 'opacity-100' : 'opacity-20'
            } ${location.current ? 'scale-125' : 'hover:scale-110'}`}
            style={{
              left: `${location.x}%`,
              top: `${location.y}%`,
            }}
            onMouseEnter={() => setHoveredLocation(location.id)}
            onMouseLeave={() => setHoveredLocation(null)}
            onClick={() => location.discovered && onLocationClick?.(location)}
          >
            {/* Pulse effect for current location */}
            {location.current && (
              <div className="absolute inset-0 -m-2">
                <div className="w-8 h-8 bg-amber-400/30 rounded-full animate-ping" />
              </div>
            )}
            
            {/* Location Icon */}
            <div className={`relative text-2xl ${location.current ? 'drop-shadow-lg' : ''}`}>
              {LOCATION_ICONS[location.type] || '📍'}
            </div>

            {/* Tooltip */}
            {hoveredLocation === location.id && location.discovered && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg whitespace-nowrap z-10">
                <div className="text-sm font-bold text-white">{location.name}</div>
                {location.current && (
                  <div className="text-xs text-amber-400">📍 You are here</div>
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="w-2 h-2 bg-gray-900 border-r border-b border-gray-600 transform rotate-45" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Compass Rose */}
        <div className="absolute top-4 right-4 text-gray-500 opacity-50">
          <Compass className="w-12 h-12" />
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-1">Legend:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <span>🏘️</span>
              <span className="text-gray-300">Village</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🌲</span>
              <span className="text-gray-300">Forest</span>
            </div>
            <div className="flex items-center gap-1">
              <span>⛰️</span>
              <span className="text-gray-300">Mountain</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🏰</span>
              <span className="text-gray-300">Dungeon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default locations for the game world
export const DEFAULT_LOCATIONS: Location[] = [
  { id: 'village-start', name: 'Millhaven Village', x: 50, y: 70, type: 'village', discovered: true, current: true },
  { id: 'forest-north', name: 'Whispering Woods', x: 45, y: 40, type: 'forest', discovered: false },
  { id: 'mountain-east', name: 'Grimhold Peak', x: 80, y: 30, type: 'mountain', discovered: false },
  { id: 'dungeon-south', name: 'Ancient Ruins', x: 30, y: 85, type: 'ruins', discovered: false },
  { id: 'city-west', name: 'King\'s Landing', x: 15, y: 50, type: 'city', discovered: false },
  { id: 'forest-west', name: 'Dark Thicket', x: 25, y: 25, type: 'forest', discovered: false },
  { id: 'mountain-north', name: 'Dragon\'s Spine', x: 65, y: 15, type: 'mountain', discovered: false },
  { id: 'dungeon-east', name: 'Forgotten Tomb', x: 85, y: 65, type: 'dungeon', discovered: false },
];
