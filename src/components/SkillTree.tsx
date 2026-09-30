import { useState } from 'react';
import { Sparkles, Lock, Check } from 'lucide-react';

interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  requires: string[];
  unlocked: boolean;
  category: 'combat' | 'magic' | 'stealth' | 'social';
}

const SKILL_TREE: SkillNode[] = [
  // Tier 1 - Starting skills
  { id: 'basic-attack', name: 'Basic Attack', description: 'Improved melee damage', icon: '⚔️', tier: 1, requires: [], unlocked: true, category: 'combat' },
  { id: 'fireball', name: 'Fireball', description: 'Launch a ball of fire', icon: '🔥', tier: 1, requires: [], unlocked: false, category: 'magic' },
  { id: 'stealth', name: 'Stealth', description: 'Move without being noticed', icon: '🥷', tier: 1, requires: [], unlocked: false, category: 'stealth' },
  { id: 'persuade', name: 'Persuade', description: 'Convince others to your side', icon: '💬', tier: 1, requires: [], unlocked: false, category: 'social' },
  
  // Tier 2
  { id: 'power-strike', name: 'Power Strike', description: 'Devastating melee attack', icon: '💥', tier: 2, requires: ['basic-attack'], unlocked: false, category: 'combat' },
  { id: 'ice-shard', name: 'Ice Shard', description: 'Freezing projectile', icon: '❄️', tier: 2, requires: ['fireball'], unlocked: false, category: 'magic' },
  { id: 'backstab', name: 'Backstab', description: 'Critical damage from behind', icon: '🗡️', tier: 2, requires: ['stealth'], unlocked: false, category: 'stealth' },
  { id: 'intimidate', name: 'Intimidate', description: 'Frighten enemies', icon: '😠', tier: 2, requires: ['persuade'], unlocked: false, category: 'social' },
  
  // Tier 3
  { id: 'whirlwind', name: 'Whirlwind', description: 'Hit all nearby enemies', icon: '🌪️', tier: 3, requires: ['power-strike'], unlocked: false, category: 'combat' },
  { id: 'lightning', name: 'Lightning Bolt', description: 'Chain lightning attack', icon: '⚡', tier: 3, requires: ['ice-shard'], unlocked: false, category: 'magic' },
  { id: 'shadow-step', name: 'Shadow Step', description: 'Teleport through shadows', icon: '👤', tier: 3, requires: ['backstab'], unlocked: false, category: 'stealth' },
  { id: 'charm', name: 'Charm', description: 'Bend others to your will', icon: '✨', tier: 3, requires: ['intimidate'], unlocked: false, category: 'social' },
];

interface SkillTreeProps {
  unlockedSkills: string[];
  availablePoints: number;
  onUnlockSkill: (skillId: string) => void;
}

export default function SkillTree({ unlockedSkills, availablePoints, onUnlockSkill }: SkillTreeProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'combat' | 'magic' | 'stealth' | 'social'>('all');
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const categories = [
    { id: 'all' as const, name: 'All', icon: '🌟', color: 'text-white' },
    { id: 'combat' as const, name: 'Combat', icon: '⚔️', color: 'text-red-400' },
    { id: 'magic' as const, name: 'Magic', icon: '🔮', color: 'text-blue-400' },
    { id: 'stealth' as const, name: 'Stealth', icon: '🥷', color: 'text-green-400' },
    { id: 'social' as const, name: 'Social', icon: '💬', color: 'text-purple-400' },
  ];

  const filteredSkills = selectedCategory === 'all' 
    ? SKILL_TREE 
    : SKILL_TREE.filter(s => s.category === selectedCategory);

  const tiers = [1, 2, 3];

  const canUnlock = (skill: SkillNode): boolean => {
    if (skill.unlocked || unlockedSkills.includes(skill.id)) return false;
    if (availablePoints <= 0) return false;
    return skill.requires.every(req => unlockedSkills.includes(req));
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="text-amber-400" />
          Skill Tree
        </h3>
        <div className="text-sm text-amber-400 font-bold">
          {availablePoints} points available
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Skill Tiers */}
      <div className="space-y-6">
        {tiers.map((tier) => {
          const tierSkills = filteredSkills.filter(s => s.tier === tier);
          if (tierSkills.length === 0) return null;

          return (
            <div key={tier}>
              <div className="text-xs text-gray-500 uppercase font-bold mb-2">
                Tier {tier}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {tierSkills.map((skill) => {
                  const isUnlocked = skill.unlocked || unlockedSkills.includes(skill.id);
                  const canUnlockSkill = canUnlock(skill);
                  
                  return (
                    <div
                      key={skill.id}
                      className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isUnlocked
                          ? 'border-amber-500 bg-amber-900/20'
                          : canUnlockSkill
                          ? 'border-green-600 bg-green-900/10 hover:bg-green-900/20 animate-pulse'
                          : 'border-gray-700 bg-gray-900/30 opacity-50'
                      }`}
                      onClick={() => canUnlockSkill && onUnlockSkill(skill.id)}
                      onMouseEnter={() => setHoveredSkill(skill.id)}
                      onMouseLeave={() => setHoveredSkill(null)}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">{skill.icon}</div>
                        <div className="text-xs font-bold text-white">{skill.name}</div>
                        {isUnlocked && (
                          <div className="absolute top-1 right-1">
                            <Check className="w-3 h-3 text-amber-400" />
                          </div>
                        )}
                        {!isUnlocked && !canUnlockSkill && (
                          <div className="absolute top-1 right-1">
                            <Lock className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Tooltip */}
                      {hoveredSkill === skill.id && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg whitespace-nowrap z-10 text-xs">
                          <div className="font-bold text-white">{skill.name}</div>
                          <div className="text-gray-400">{skill.description}</div>
                          {skill.requires.length > 0 && (
                            <div className="text-gray-500 mt-1">
                              Requires: {skill.requires.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { SKILL_TREE };
export type { SkillNode };
