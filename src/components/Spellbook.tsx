import { Book, Sparkles, Lock } from 'lucide-react';

export interface Spell {
  id: string;
  name: string;
  description: string;
  icon: string;
  manaCost: number;
  damage?: number;
  healing?: number;
  effect?: string;
  level: number;
  school: 'fire' | 'ice' | 'lightning' | 'healing' | 'utility' | 'dark';
  unlocked: boolean;
  cooldown: number; // turns
}

interface SpellbookProps {
  spells: Spell[];
  currentMana: number;
  onCastSpell: (spell: Spell) => void;
}

export default function Spellbook({ spells, currentMana, onCastSpell }: SpellbookProps) {
  const schoolColors = {
    fire: 'text-red-400 border-red-700/50 bg-red-900/10',
    ice: 'text-blue-400 border-blue-700/50 bg-blue-900/10',
    lightning: 'text-yellow-400 border-yellow-700/50 bg-yellow-900/10',
    healing: 'text-green-400 border-green-700/50 bg-green-900/10',
    utility: 'text-purple-400 border-purple-700/50 bg-purple-900/10',
    dark: 'text-gray-400 border-gray-700/50 bg-gray-900/10',
  };

  const schoolIcons = {
    fire: '🔥',
    ice: '❄️',
    lightning: '⚡',
    healing: '💚',
    utility: '✨',
    dark: '🌑',
  };

  const unlockedSpells = spells.filter(s => s.unlocked);
  const lockedSpells = spells.filter(s => !s.unlocked);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Book className="text-blue-400" />
          Spellbook
        </h3>
        <div className="text-sm text-blue-400">
          {unlockedSpells.length} / {spells.length} spells
        </div>
      </div>

      {/* Mana Display */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-300">Current Mana</span>
          <span className="text-white font-bold">{currentMana}</span>
        </div>
      </div>

      {/* Unlocked Spells */}
      {unlockedSpells.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-gray-400 mb-2">Learned Spells</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {unlockedSpells.map((spell) => {
              const canCast = currentMana >= spell.manaCost;
              
              return (
                <div
                  key={spell.id}
                  className={`border rounded-lg p-3 transition-all ${schoolColors[spell.school]} ${
                    canCast ? 'cursor-pointer hover:scale-105' : 'opacity-50'
                  }`}
                  onClick={() => canCast && onCastSpell(spell)}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-2xl">{spell.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-white text-sm">{spell.name}</h5>
                        <span className="text-xs text-blue-300">{spell.manaCost} MP</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{spell.description}</p>
                      <div className="flex gap-2 mt-2 text-xs">
                        {spell.damage && <span className="text-red-400">⚔️ {spell.damage}</span>}
                        {spell.healing && <span className="text-green-400">❤️ +{spell.healing}</span>}
                        {spell.effect && <span className="text-purple-400">✨ {spell.effect}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Spells */}
      {lockedSpells.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-400 mb-2">Locked Spells</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {lockedSpells.map((spell) => (
              <div
                key={spell.id}
                className="border border-gray-700 rounded-lg p-2 bg-gray-900/30 opacity-50"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1 relative">
                    {spell.icon}
                    <Lock className="absolute -top-1 -right-1 w-3 h-3 text-gray-500" />
                  </div>
                  <div className="text-xs font-bold text-gray-400">{spell.name}</div>
                  <div className="text-xs text-gray-500">Level {spell.level}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {spells.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Book className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No spells available yet.</p>
          <p className="text-xs mt-1">Level up to learn new spells.</p>
        </div>
      )}
    </div>
  );
}

// Default spells
export const DEFAULT_SPELLS: Spell[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Launch a ball of fire at your enemy',
    icon: '🔥',
    manaCost: 15,
    damage: 25,
    level: 1,
    school: 'fire',
    unlocked: false,
    cooldown: 0,
  },
  {
    id: 'ice-shard',
    name: 'Ice Shard',
    description: 'Fire a piercing shard of ice',
    icon: '❄️',
    manaCost: 12,
    damage: 20,
    effect: 'Slow',
    level: 1,
    school: 'ice',
    unlocked: false,
    cooldown: 0,
  },
  {
    id: 'lightning-bolt',
    name: 'Lightning Bolt',
    description: 'Strike with electrical energy',
    icon: '⚡',
    manaCost: 20,
    damage: 30,
    level: 2,
    school: 'lightning',
    unlocked: false,
    cooldown: 1,
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Restore health to yourself',
    icon: '💚',
    manaCost: 18,
    healing: 30,
    level: 1,
    school: 'healing',
    unlocked: false,
    cooldown: 0,
  },
  {
    id: 'shield',
    name: 'Magic Shield',
    description: 'Create a protective barrier',
    icon: '🛡️',
    manaCost: 15,
    effect: '+10 Defense',
    level: 2,
    school: 'utility',
    unlocked: false,
    cooldown: 2,
  },
  {
    id: 'dark-bolt',
    name: 'Dark Bolt',
    description: 'Channel dark energy',
    icon: '🌑',
    manaCost: 25,
    damage: 35,
    level: 3,
    school: 'dark',
    unlocked: false,
    cooldown: 1,
  },
];


