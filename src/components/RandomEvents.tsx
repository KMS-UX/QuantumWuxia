import { useState } from 'react';
import { Zap, X } from 'lucide-react';

export interface RandomEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'positive' | 'negative' | 'neutral' | 'combat' | 'discovery';
  effects: {
    hpChange?: number;
    manaChange?: number;
    goldChange?: number;
    xpChange?: number;
    itemGained?: string;
    itemLost?: string;
  };
  choices?: {
    text: string;
    risk: 'low' | 'medium' | 'high';
    outcome: string;
    effects: RandomEvent['effects'];
  }[];
}

const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: 'find-gold',
    title: 'Lucky Find!',
    description: 'You stumble upon a small pouch of gold coins hidden in the grass.',
    icon: '💰',
    type: 'positive',
    effects: { goldChange: 15 },
  },
  {
    id: 'wandering-merchant',
    title: 'Wandering Merchant',
    description: 'A friendly merchant offers you a rare item at a good price.',
    icon: '🧳',
    type: 'neutral',
    effects: { goldChange: -10, itemGained: 'Rare Gem' },
  },
  {
    id: 'ambush',
    title: 'Ambush!',
    description: 'Bandits leap from the shadows, demanding your gold!',
    icon: '🗡️',
    type: 'combat',
    effects: {},
    choices: [
      {
        text: 'Fight them off',
        risk: 'high',
        outcome: 'You defeat the bandits and claim their loot!',
        effects: { xpChange: 25, goldChange: 20 },
      },
      {
        text: 'Pay them off',
        risk: 'low',
        outcome: 'You hand over some gold and they leave you alone.',
        effects: { goldChange: -15 },
      },
      {
        text: 'Try to escape',
        risk: 'medium',
        outcome: 'You manage to flee, but lose some supplies in the process.',
        effects: { hpChange: -5, itemLost: 'Health Potion' },
      },
    ],
  },
  {
    id: 'mysterious-stranger',
    title: 'Mysterious Stranger',
    description: 'A cloaked figure approaches you with an offer.',
    icon: '🧙',
    type: 'neutral',
    effects: {},
    choices: [
      {
        text: 'Accept their gift',
        risk: 'medium',
        outcome: 'The stranger gives you a magical trinket before vanishing.',
        effects: { itemGained: 'Mystic Amulet', xpChange: 10 },
      },
      {
        text: 'Decline politely',
        risk: 'low',
        outcome: 'The stranger nods and disappears into the shadows.',
        effects: {},
      },
      {
        text: 'Demand answers',
        risk: 'high',
        outcome: 'The stranger reveals hidden knowledge before leaving.',
        effects: { xpChange: 30, manaChange: -10 },
      },
    ],
  },
  {
    id: 'healing-spring',
    title: 'Healing Spring',
    description: 'You discover a crystal-clear spring with magical properties.',
    icon: '💧',
    type: 'positive',
    effects: { hpChange: 20, manaChange: 15 },
  },
  {
    id: 'trap',
    title: 'Hidden Trap!',
    description: 'You trigger a concealed trap!',
    icon: '⚠️',
    type: 'negative',
    effects: { hpChange: -10 },
  },
  {
    id: 'treasure-chest',
    title: 'Treasure Chest',
    description: 'You find an old chest half-buried in the ground.',
    icon: '📦',
    type: 'discovery',
    effects: {},
    choices: [
      {
        text: 'Open it carefully',
        risk: 'low',
        outcome: 'The chest contains valuable items!',
        effects: { goldChange: 30, itemGained: 'Ancient Coin' },
      },
      {
        text: 'Smash it open',
        risk: 'medium',
        outcome: 'You break the chest and grab what you can.',
        effects: { goldChange: 20, itemGained: 'Rusty Sword' },
      },
      {
        text: 'Leave it alone',
        risk: 'low',
        outcome: 'You decide it\'s not worth the risk.',
        effects: {},
      },
    ],
  },
  {
    id: 'wild-animal',
    title: 'Wild Animal',
    description: 'A hungry beast blocks your path!',
    icon: '🐺',
    type: 'combat',
    effects: {},
    choices: [
      {
        text: 'Fight the beast',
        risk: 'high',
        outcome: 'After a fierce battle, you emerge victorious!',
        effects: { hpChange: -8, xpChange: 20, goldChange: 5 },
      },
      {
        text: 'Try to scare it away',
        risk: 'medium',
        outcome: 'Your shouts frighten the creature and it runs off.',
        effects: { xpChange: 5 },
      },
      {
        text: 'Offer it food',
        risk: 'low',
        outcome: 'The beast takes the food and lets you pass.',
        effects: { goldChange: -5 },
      },
    ],
  },
  {
    id: 'ancient-ruins',
    title: 'Ancient Ruins',
    description: 'You discover the remains of an ancient structure.',
    icon: '🏛️',
    type: 'discovery',
    effects: { xpChange: 15 },
  },
  {
    id: 'cursed-item',
    title: 'Cursed Item',
    description: 'You find a strange artifact that pulses with dark energy.',
    icon: '💀',
    type: 'negative',
    effects: {},
    choices: [
      {
        text: 'Take it anyway',
        risk: 'high',
        outcome: 'The curse drains some of your life force.',
        effects: { hpChange: -15, itemGained: 'Cursed Ring' },
      },
      {
        text: 'Try to purify it',
        risk: 'medium',
        outcome: 'You manage to cleanse the artifact of its curse.',
        effects: { manaChange: -10, itemGained: 'Blessed Ring', xpChange: 20 },
      },
      {
        text: 'Leave it behind',
        risk: 'low',
        outcome: 'Wisely, you decide to leave the cursed item alone.',
        effects: {},
      },
    ],
  },
];

interface RandomEventDisplayProps {
  event: RandomEvent;
  onResolve: (choiceIndex?: number) => void;
}

export function RandomEventDisplay({ event, onResolve }: RandomEventDisplayProps) {
  const typeColors = {
    positive: 'border-green-600 bg-green-900/20',
    negative: 'border-red-600 bg-red-900/20',
    neutral: 'border-blue-600 bg-blue-900/20',
    combat: 'border-orange-600 bg-orange-900/20',
    discovery: 'border-purple-600 bg-purple-900/20',
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`border-2 rounded-xl max-w-lg w-full p-6 ${typeColors[event.type]}`}>
        <div className="text-center mb-4">
          <div className="text-6xl mb-3">{event.icon}</div>
          <h2 className="text-2xl font-bold text-white">{event.title}</h2>
          <p className="text-gray-300 mt-2">{event.description}</p>
        </div>

        {event.choices ? (
          <div className="space-y-2 mt-6">
            {event.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => onResolve(i)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  choice.risk === 'low'
                    ? 'border-green-700/50 bg-green-900/20 hover:bg-green-900/40'
                    : choice.risk === 'medium'
                    ? 'border-yellow-700/50 bg-yellow-900/20 hover:bg-yellow-900/40'
                    : 'border-red-700/50 bg-red-900/20 hover:bg-red-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{choice.text}</span>
                  <span className={`text-xs ${
                    choice.risk === 'low' ? 'text-green-400' :
                    choice.risk === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {choice.risk === 'low' ? '🟢 Safe' : choice.risk === 'medium' ? '🟡 Risky' : '🔴 Dangerous'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => onResolve()}
            className="w-full mt-6 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-all"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export function getRandomEvent(): RandomEvent {
  return RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
}

export function shouldTriggerEvent(turnCount: number): boolean {
  // 15% chance every 3 turns after turn 5
  if (turnCount < 5 || turnCount % 3 !== 0) return false;
  return Math.random() < 0.15;
}

export { RANDOM_EVENTS };
