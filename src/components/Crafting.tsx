import { useState } from 'react';
import { InventoryItem } from '../types/game';
import { FlaskConical, Plus, X, Sparkles } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: { itemName: string; quantity: number }[];
  result: { name: string; type: InventoryItem['type']; description: string; value: number };
  icon: string;
}

const RECIPES: Recipe[] = [
  {
    id: 'health-potion',
    name: 'Health Potion',
    description: 'A basic healing draught',
    ingredients: [
      { itemName: 'Herb', quantity: 2 },
    ],
    result: { name: 'Health Potion', type: 'potion', description: 'Restores 20 HP', value: 15 },
    icon: '🧪',
  },
  {
    id: 'mana-potion',
    name: 'Mana Potion',
    ingredients: [
      { itemName: 'Crystal Shard', quantity: 1 },
      { itemName: 'Herb', quantity: 1 },
    ],
    result: { name: 'Mana Potion', type: 'potion', description: 'Restores 15 Mana', value: 20 },
    description: 'Restores magical energy',
    icon: '💧',
  },
  {
    id: 'antidote',
    name: 'Antidote',
    description: 'Cures common poisons',
    ingredients: [
      { itemName: 'Herb', quantity: 3 },
    ],
    result: { name: 'Antidote', type: 'potion', description: 'Cures poison effects', value: 25 },
    icon: '💊',
  },
  {
    id: 'torch',
    name: 'Torch',
    description: 'Provides light in dark places',
    ingredients: [
      { itemName: 'Cloth', quantity: 1 },
      { itemName: 'Wood', quantity: 1 },
    ],
    result: { name: 'Torch', type: 'misc', description: 'Illuminates dark areas', value: 5 },
    icon: '🔥',
  },
  {
    id: 'rope',
    name: 'Rope',
    description: 'Useful for climbing and binding',
    ingredients: [
      { itemName: 'Cloth', quantity: 3 },
    ],
    result: { name: 'Rope', type: 'misc', description: '50 feet of sturdy rope', value: 10 },
    icon: '🪢',
  },
  {
    id: 'enhanced-weapon',
    name: 'Enhanced Weapon',
    description: 'Sharpen and strengthen a weapon',
    ingredients: [
      { itemName: 'Iron Sword', quantity: 1 },
      { itemName: 'Crystal Shard', quantity: 2 },
    ],
    result: { name: 'Crystal-Edged Sword', type: 'weapon', description: 'A blade infused with crystal magic', value: 75 },
    icon: '⚔️',
  },
];

interface CraftingProps {
  inventory: InventoryItem[];
  onCraft: (recipe: Recipe) => void;
}

export default function Crafting({ inventory, onCraft }: CraftingProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const canCraft = (recipe: Recipe): boolean => {
    return recipe.ingredients.every(ingredient => {
      const item = inventory.find(i => i.name === ingredient.itemName);
      return item && item.quantity >= ingredient.quantity;
    });
  };

  const getInventoryCount = (itemName: string): number => {
    const item = inventory.find(i => i.name === itemName);
    return item ? item.quantity : 0;
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <FlaskConical className="text-purple-400" />
        Crafting
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {RECIPES.map((recipe) => {
          const craftable = canCraft(recipe);
          
          return (
            <div
              key={recipe.id}
              className={`border rounded-lg p-3 transition-all ${
                craftable
                  ? 'border-green-700/50 bg-green-900/10 hover:bg-green-900/20 cursor-pointer'
                  : 'border-gray-700 bg-gray-900/30 opacity-60'
              }`}
              onClick={() => craftable && setSelectedRecipe(recipe)}
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl">{recipe.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">{recipe.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{recipe.description}</div>
                  
                  {/* Ingredients */}
                  <div className="mt-2 space-y-1">
                    {recipe.ingredients.map((ing, i) => {
                      const have = getInventoryCount(ing.itemName);
                      const enough = have >= ing.quantity;
                      
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className={enough ? 'text-green-400' : 'text-red-400'}>
                            {ing.itemName}
                          </span>
                          <span className={enough ? 'text-green-400' : 'text-red-400'}>
                            {have}/{ing.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {craftable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCraft(recipe);
                      }}
                      className="mt-2 w-full bg-green-700 hover:bg-green-600 text-white text-xs py-1.5 rounded transition-all flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Craft
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {RECIPES.every(r => !canCraft(r)) && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>You don't have the materials to craft anything yet.</p>
          <p className="text-xs mt-1">Collect more items to unlock recipes.</p>
        </div>
      )}
    </div>
  );
}

export { RECIPES };
export type { Recipe };
