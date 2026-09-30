import { useState } from 'react';
import { InventoryItem } from '../types/game';
import { ShoppingBag, X, Coins, Package } from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  type: InventoryItem['type'];
  description: string;
  price: number;
  stock: number; // -1 for unlimited
  icon: string;
}

interface MerchantProps {
  merchantName: string;
  merchantType: 'general' | 'weapons' | 'potions' | 'magic' | 'blackmarket';
  items: ShopItem[];
  playerGold: number;
  playerInventory: InventoryItem[];
  onBuy: (item: ShopItem) => void;
  onSell: (item: InventoryItem) => void;
  onClose: () => void;
}

const MERCHANT_GREETINGS: Record<string, string[]> = {
  general: [
    "Welcome, traveler! What can I get for you?",
    "Fine goods at fair prices!",
    "Everything a weary adventurer needs!",
  ],
  weapons: [
    "Looking for something sharp?",
    "The finest weapons in the realm!",
    "Arm yourself well, friend.",
  ],
  potions: [
    "Healing draughts and magical elixirs!",
    "Potions for every ailment!",
    "Brewed with the finest ingredients.",
  ],
  magic: [
    "Arcane artifacts and mystical tomes!",
    "Rare magical items, freshly acquired.",
    "Power awaits those who seek it.",
  ],
  blackmarket: [
    "Psst... looking for something special?",
    "No questions asked, friend.",
    "Rare finds, if you know where to look.",
  ],
};

export default function Merchant({ merchantName, merchantType, items, playerGold, playerInventory, onBuy, onSell, onClose }: MerchantProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [selectedItem, setSelectedItem] = useState<ShopItem | InventoryItem | null>(null);

  const greetings = MERCHANT_GREETINGS[merchantType];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  const sellPrice = (item: InventoryItem) => Math.floor(item.value * 0.6);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/30 to-gray-900 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="text-amber-400" />
                {merchantName}
              </h2>
              <p className="text-sm text-gray-400 italic mt-1">"{greeting}"</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Gold Display */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-1.5">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-bold">{playerGold}g</span>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setMode('buy')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  mode === 'buy' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setMode('sell')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  mode === 'sell' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Sell
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'buy' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((item) => {
                const canAfford = playerGold >= item.price;
                const inStock = item.stock !== 0;
                
                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 transition-all ${
                      canAfford && inStock
                        ? 'border-green-700/50 bg-green-900/10 hover:bg-green-900/20'
                        : 'border-gray-700 bg-gray-900/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-sm">{item.name}</h4>
                          <span className="text-yellow-400 font-bold text-sm">{item.price}g</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {item.stock === -1 ? '∞ in stock' : `${item.stock} left`}
                          </span>
                          <button
                            onClick={() => onBuy(item)}
                            disabled={!canAfford || !inStock}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs px-3 py-1 rounded transition-all"
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {playerInventory.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Your inventory is empty.</p>
                </div>
              ) : (
                playerInventory.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-700 rounded-lg p-3 bg-gray-900/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : item.type === 'potion' ? '🧪' : '📦'}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-sm">{item.name}</h4>
                          <span className="text-yellow-400 font-bold text-sm">{sellPrice(item)}g</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">x{item.quantity}</span>
                          <button
                            onClick={() => onSell(item)}
                            className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition-all"
                          >
                            Sell
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { ShopItem };
