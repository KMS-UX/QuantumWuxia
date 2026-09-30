import { useState } from 'react';
import { Character, InventoryItem } from '../types/game';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '../store/gameStore';
import { Sword, Shield, Sparkles, Heart, Star, Dices } from 'lucide-react';

const CLASSES = [
  { name: 'Warrior', icon: '⚔️', description: 'Masters of combat with high strength and endurance', baseStats: { strength: 8, agility: 4, intelligence: 3, charisma: 4, luck: 3 } },
  { name: 'Rogue', icon: '🗡️', description: 'Cunning fighters who rely on agility and stealth', baseStats: { strength: 4, agility: 8, intelligence: 5, charisma: 4, luck: 5 } },
  { name: 'Mage', icon: '🔮', description: 'Wielders of arcane power with vast knowledge', baseStats: { strength: 2, agility: 3, intelligence: 9, charisma: 4, luck: 4 } },
  { name: 'Ranger', icon: '🏹', description: 'Skilled hunters and trackers of the wilderness', baseStats: { strength: 5, agility: 7, intelligence: 4, charisma: 3, luck: 5 } },
  { name: 'Paladin', icon: '🛡️', description: 'Holy warriors who protect the innocent', baseStats: { strength: 7, agility: 3, intelligence: 4, charisma: 7, luck: 3 } },
  { name: 'Bard', icon: '🎵', description: 'Charismatic performers who inspire and deceive', baseStats: { strength: 3, agility: 5, intelligence: 5, charisma: 9, luck: 5 } },
];

const RACES = [
  { name: 'Human', icon: '👤', description: 'Versatile and adaptable', bonus: 'All stats +1' },
  { name: 'Elf', icon: '🧝', description: 'Graceful and long-lived', bonus: 'Agility +2, Intelligence +1' },
  { name: 'Dwarf', icon: '⛏️', description: 'Stout and resilient', bonus: 'Strength +2, Luck +1' },
  { name: 'Halfling', icon: '🍀', description: 'Small but surprisingly brave', bonus: 'Luck +3, Charisma +1' },
  { name: 'Dragonborn', icon: '🐉', description: 'Proud descendants of dragons', bonus: 'Strength +2, Charisma +2' },
  { name: 'Tiefling', icon: '😈', description: 'Bearer of infernal heritage', bonus: 'Intelligence +2, Charisma +2' },
];

const BACKGROUNDS = [
  'Orphaned at a young age, raised by a mysterious hermit in the mountains.',
  'Former soldier who deserted after witnessing the horrors of war.',
  'Apprentice to a renowned master who was recently murdered.',
  'Noble-born but chose adventure over a life of luxury.',
  'Survived a shipwreck and washed ashore with nothing but memories.',
  'Grew up on the streets, learning to survive by wit and cunning.',
  'Descended from a long line of adventurers, seeking to uphold the family legacy.',
  'A scholar who discovered an ancient text that set them on a path of adventure.',
];

export default function CharacterCreation() {
  const { startNewGame, settings } = useGameStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [selectedRace, setSelectedRace] = useState(RACES[0]);
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const rollStats = () => {
    const base = selectedClass.baseStats;
    const rolled = {
      strength: Math.max(1, base.strength + Math.floor(Math.random() * 3) - 1),
      agility: Math.max(1, base.agility + Math.floor(Math.random() * 3) - 1),
      intelligence: Math.max(1, base.intelligence + Math.floor(Math.random() * 3) - 1),
      charisma: Math.max(1, base.charisma + Math.floor(Math.random() * 3) - 1),
      luck: Math.max(1, base.luck + Math.floor(Math.random() * 3) - 1),
    };
    
    // Apply race bonuses
    if (selectedRace.name === 'Human') {
      rolled.strength += 1; rolled.agility += 1; rolled.intelligence += 1; rolled.charisma += 1; rolled.luck += 1;
    } else if (selectedRace.name === 'Elf') {
      rolled.agility += 2; rolled.intelligence += 1;
    } else if (selectedRace.name === 'Dwarf') {
      rolled.strength += 2; rolled.luck += 1;
    } else if (selectedRace.name === 'Halfling') {
      rolled.luck += 3; rolled.charisma += 1;
    } else if (selectedRace.name === 'Dragonborn') {
      rolled.strength += 2; rolled.charisma += 2;
    } else if (selectedRace.name === 'Tiefling') {
      rolled.intelligence += 2; rolled.charisma += 2;
    }
    
    return rolled;
  };

  const handleCreate = async () => {
    setIsCreating(true);
    const stats = rollStats();
    
    const character: Character = {
      id: uuidv4(),
      name: name || 'Unknown Hero',
      class: selectedClass.name,
      race: selectedRace.name,
      level: 1,
      experience: 0,
      stats: {
        ...stats,
        maxHp: 20 + stats.strength * 2,
        currentHp: 20 + stats.strength * 2,
        maxMana: 10 + stats.intelligence * 2,
        currentMana: 10 + stats.intelligence * 2,
      },
      skills: [],
      inventory: getStartingEquipment(selectedClass.name),
      gold: 10 + stats.luck * 2,
      background: selectedBackground,
    };
    
    await startNewGame(character);
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-500 mb-2">
            ⚔️ Realm of Echoes ⚔️
          </h1>
          <p className="text-gray-400 text-lg">An AI-Powered Text RPG Adventure</p>
          <p className="text-gray-500 text-sm mt-1">
            LLM: {settings.llmConfig.provider} / {settings.llmConfig.model}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-all ${
                s <= step ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-amber-400" /> Create Your Hero
              </h2>
              <div>
                <label className="block text-gray-300 mb-2">Character Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your hero's name..."
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02]"
              >
                Next: Choose Your Race →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Heart className="text-red-400" /> Choose Your Race
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {RACES.map((race) => (
                  <button
                    key={race.name}
                    onClick={() => setSelectedRace(race)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedRace.name === race.name
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-700 bg-gray-900/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-3xl mb-2">{race.icon}</div>
                    <div className="font-bold text-white">{race.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{race.description}</div>
                    <div className="text-xs text-amber-400 mt-1">{race.bonus}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all"
                >
                  Next: Choose Class →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sword className="text-blue-400" /> Choose Your Class
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CLASSES.map((cls) => (
                  <button
                    key={cls.name}
                    onClick={() => setSelectedClass(cls)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedClass.name === cls.name
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-700 bg-gray-900/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-3xl mb-2">{cls.icon}</div>
                    <div className="font-bold text-white">{cls.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{cls.description}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all"
                >
                  Next: Background →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Star className="text-purple-400" /> Your Background
              </h2>
              <div className="space-y-2">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setSelectedBackground(bg)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedBackground === bg
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-700 bg-gray-900/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-sm text-gray-300">{bg}</div>
                  </button>
                ))}
              </div>
              
              {/* Character Summary */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Dices className="text-amber-400" /> Character Summary
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">Name:</div>
                  <div className="text-white">{name || 'Unknown Hero'}</div>
                  <div className="text-gray-400">Race:</div>
                  <div className="text-white">{selectedRace.icon} {selectedRace.name}</div>
                  <div className="text-gray-400">Class:</div>
                  <div className="text-white">{selectedClass.icon} {selectedClass.name}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? '⏳ Generating World...' : '🎲 Begin Adventure!'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStartingEquipment(className: string): InventoryItem[] {
  const equipment: Record<string, InventoryItem[]> = {
    Warrior: [
      { id: uuidv4(), name: 'Iron Sword', type: 'weapon', description: 'A sturdy iron blade', quantity: 1, value: 25 },
      { id: uuidv4(), name: 'Leather Armor', type: 'armor', description: 'Basic leather protection', quantity: 1, value: 15 },
      { id: uuidv4(), name: 'Health Potion', type: 'potion', description: 'Restores 20 HP', quantity: 2, value: 10 },
    ],
    Rogue: [
      { id: uuidv4(), name: 'Sharp Dagger', type: 'weapon', description: 'A keen-edged dagger', quantity: 1, value: 20 },
      { id: uuidv4(), name: 'Lockpicks', type: 'misc', description: 'A set of fine lockpicks', quantity: 1, value: 15 },
      { id: uuidv4(), name: 'Health Potion', type: 'potion', description: 'Restores 20 HP', quantity: 1, value: 10 },
    ],
    Mage: [
      { id: uuidv4(), name: 'Wooden Staff', type: 'weapon', description: 'A channeling focus', quantity: 1, value: 20 },
      { id: uuidv4(), name: 'Spellbook', type: 'misc', description: 'Contains basic spells', quantity: 1, value: 30 },
      { id: uuidv4(), name: 'Mana Potion', type: 'potion', description: 'Restores 15 Mana', quantity: 2, value: 12 },
    ],
    Ranger: [
      { id: uuidv4(), name: 'Short Bow', type: 'weapon', description: 'A compact hunting bow', quantity: 1, value: 20 },
      { id: uuidv4(), name: 'Arrows', type: 'misc', description: 'A quiver of arrows', quantity: 1, value: 10 },
      { id: uuidv4(), name: 'Health Potion', type: 'potion', description: 'Restores 20 HP', quantity: 2, value: 10 },
    ],
    Paladin: [
      { id: uuidv4(), name: 'Blessed Mace', type: 'weapon', description: 'A holy weapon', quantity: 1, value: 30 },
      { id: uuidv4(), name: 'Chain Mail', type: 'armor', description: 'Interlocking metal rings', quantity: 1, value: 25 },
      { id: uuidv4(), name: 'Health Potion', type: 'potion', description: 'Restores 20 HP', quantity: 2, value: 10 },
    ],
    Bard: [
      { id: uuidv4(), name: 'Lute', type: 'weapon', description: 'A well-crafted instrument', quantity: 1, value: 20 },
      { id: uuidv4(), name: 'Disguise Kit', type: 'misc', description: 'For changing appearance', quantity: 1, value: 15 },
      { id: uuidv4(), name: 'Health Potion', type: 'potion', description: 'Restores 20 HP', quantity: 1, value: 10 },
    ],
  };
  
  return equipment[className] || [
    { id: uuidv4(), name: 'Worn Sword', type: 'weapon', description: 'A basic blade', quantity: 1, value: 10 },
    { id: uuidv4(), name: 'Health Potion', type: 'potion', description: 'Restores 20 HP', quantity: 1, value: 10 },
  ];
}
