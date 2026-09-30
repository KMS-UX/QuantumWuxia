import { useState, useEffect } from 'react';

export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog' | 'snow' | 'wind';

interface WeatherState {
  type: WeatherType;
  intensity: 'light' | 'moderate' | 'heavy';
  description: string;
}

const WEATHER_DATA: Record<WeatherType, { descriptions: string[]; icon: string }> = {
  clear: {
    descriptions: ['The sky is clear and bright.', 'Sunlight bathes the land in warmth.', 'A beautiful day stretches before you.'],
    icon: '☀️',
  },
  cloudy: {
    descriptions: ['Clouds drift lazily overhead.', 'The sky is overcast with gray clouds.', 'Shadows play under a cloudy sky.'],
    icon: '☁️',
  },
  rain: {
    descriptions: ['Rain falls steadily, pattering against surfaces.', 'A gentle rain moistens the earth.', 'Droplets cascade from heavy clouds.'],
    icon: '🌧️',
  },
  storm: {
    descriptions: ['Thunder rumbles in the distance as lightning splits the sky.', 'A fierce storm rages around you.', 'Wind howls and rain lashes down in sheets.'],
    icon: '⛈️',
  },
  fog: {
    descriptions: ['A thick fog obscures everything beyond arm\'s reach.', 'Mist clings to the ground, reducing visibility.', 'The world is shrouded in an eerie fog.'],
    icon: '🌫️',
  },
  snow: {
    descriptions: ['Snowflakes drift gently from the sky.', 'A blanket of white covers the landscape.', 'Cold wind carries flakes of snow.'],
    icon: '❄️',
  },
  wind: {
    descriptions: ['A strong wind buffets everything in its path.', 'The wind howls through the area.', 'Gusts of wind make travel difficult.'],
    icon: '💨',
  },
};

function getWeatherForTurn(turnCount: number, worldTheme: string): WeatherState {
  // Deterministic weather based on turn count with some variation
  const seed = turnCount * 7 + 13;
  const weatherCycle = seed % 20;
  
  let type: WeatherType;
  let intensity: 'light' | 'moderate' | 'heavy';
  
  if (worldTheme === 'horror') {
    if (weatherCycle < 5) type = 'fog';
    else if (weatherCycle < 8) type = 'rain';
    else if (weatherCycle < 10) type = 'storm';
    else if (weatherCycle < 14) type = 'cloudy';
    else if (weatherCycle < 17) type = 'wind';
    else type = 'clear';
  } else if (worldTheme === 'sci-fi') {
    if (weatherCycle < 6) type = 'clear';
    else if (weatherCycle < 10) type = 'cloudy';
    else if (weatherCycle < 13) type = 'rain';
    else if (weatherCycle < 16) type = 'storm';
    else if (weatherCycle < 18) type = 'wind';
    else type = 'fog';
  } else {
    // Fantasy default
    if (weatherCycle < 6) type = 'clear';
    else if (weatherCycle < 9) type = 'cloudy';
    else if (weatherCycle < 12) type = 'rain';
    else if (weatherCycle < 14) type = 'storm';
    else if (weatherCycle < 16) type = 'fog';
    else if (weatherCycle < 18) type = 'wind';
    else type = 'snow';
  }
  
  const intensityRoll = seed % 3;
  intensity = intensityRoll === 0 ? 'light' : intensityRoll === 1 ? 'moderate' : 'heavy';
  
  const descriptions = WEATHER_DATA[type].descriptions;
  const description = descriptions[seed % descriptions.length];
  
  return { type, intensity, description };
}

interface WeatherDisplayProps {
  turnCount: number;
  worldTheme?: string;
}

export default function WeatherDisplay({ turnCount, worldTheme = 'fantasy' }: WeatherDisplayProps) {
  const weather = getWeatherForTurn(turnCount, worldTheme);
  const weatherInfo = WEATHER_DATA[weather.type];
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700/50">
      <span className="text-sm">{weatherInfo.icon}</span>
      <span className="text-xs text-gray-300 capitalize">
        {weather.intensity} {weather.type}
      </span>
    </div>
  );
}

// Weather effects on gameplay
export function getWeatherEffects(weather: WeatherState): {
  stealthModifier: number;
  perceptionModifier: number;
  travelModifier: number;
  moodModifier: string;
} {
  const effects = {
    stealthModifier: 0,
    perceptionModifier: 0,
    travelModifier: 0,
    moodModifier: 'neutral',
  };

  switch (weather.type) {
    case 'fog':
      effects.stealthModifier = 3;
      effects.perceptionModifier = -3;
      effects.moodModifier = 'eerie';
      break;
    case 'rain':
      effects.stealthModifier = 2;
      effects.perceptionModifier = -1;
      effects.moodModifier = 'melancholy';
      break;
    case 'storm':
      effects.stealthModifier = 4;
      effects.perceptionModifier = -4;
      effects.travelModifier = -2;
      effects.moodModifier = 'ominous';
      break;
    case 'snow':
      effects.stealthModifier = 1;
      effects.perceptionModifier = -2;
      effects.travelModifier = -1;
      effects.moodModifier = 'serene';
      break;
    case 'wind':
      effects.stealthModifier = 1;
      effects.perceptionModifier = -1;
      effects.moodModifier = 'restless';
      break;
    case 'clear':
      effects.perceptionModifier = 1;
      effects.moodModifier = 'hopeful';
      break;
    case 'cloudy':
      effects.moodModifier = 'contemplative';
      break;
  }

  if (weather.intensity === 'heavy') {
    effects.stealthModifier += 2;
    effects.perceptionModifier -= 2;
    effects.travelModifier -= 1;
  }

  return effects;
}

export { getWeatherForTurn };
export type { WeatherState };
