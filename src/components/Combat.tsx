import { useState } from 'react';
import { Enemy, Character } from '../types/game';
import { Sword, Shield, Heart, Zap, Skull, Trophy } from 'lucide-react';

interface CombatProps {
  player: Character;
  enemy: Enemy;
  onCombatEnd: (result: 'victory' | 'defeat', updatedPlayer: Character) => void;
}

export default function Combat({ player, enemy, onCombatEnd }: CombatProps) {
  const [currentEnemy, setCurrentEnemy] = useState<Enemy>({ ...enemy });
  const [currentPlayer, setCurrentPlayer] = useState<Character>({ ...player });
  const [combatLog, setCombatLog] = useState<string[]>([`A ${enemy.name} appears! ${enemy.description}`]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatEnded, setCombatEnded] = useState(false);

  const calculateDamage = (attacker: number, defender: number) => {
    const baseDamage = Math.max(1, attacker - defender / 2);
    const variance = Math.floor(Math.random() * 3) - 1; // -1 to +1
    return Math.max(1, baseDamage + variance);
  };

  const handleAttack = () => {
    if (!isPlayerTurn || combatEnded) return;

    const damage = calculateDamage(currentPlayer.stats.strength, currentEnemy.defense);
    const newEnemyHp = Math.max(0, currentEnemy.hp - damage);
    
    setCurrentEnemy({ ...currentEnemy, hp: newEnemyHp });
    setCombatLog([...combatLog, `You attack for ${damage} damage!`]);

    if (newEnemyHp <= 0) {
      setCombatLog(prev => [...prev, `${currentEnemy.name} is defeated!`]);
      setCombatEnded(true);
      const xpGained = 20 + currentPlayer.level * 5;
      const goldGained = 10 + Math.floor(Math.random() * 20);
      setCombatLog(prev => [...prev, `You gained ${xpGained} XP and ${goldGained} gold!`]);
      
      const updatedPlayer = {
        ...currentPlayer,
        experience: currentPlayer.experience + xpGained,
        gold: currentPlayer.gold + goldGained,
      };
      
      setTimeout(() => onCombatEnd('victory', updatedPlayer), 2000);
      return;
    }

    setIsPlayerTurn(false);
    setTimeout(() => enemyTurn(), 1000);
  };

  const handleDefend = () => {
    if (!isPlayerTurn || combatEnded) return;

    setCombatLog([...combatLog, `You take a defensive stance!`]);
    setIsPlayerTurn(false);
    setTimeout(() => enemyTurn(true), 1000);
  };

  const handleUsePotion = () => {
    if (!isPlayerTurn || combatEnded) return;

    const potionIndex = currentPlayer.inventory.findIndex(i => i.type === 'potion' && i.name.includes('Health'));
    if (potionIndex === -1) {
      setCombatLog([...combatLog, `You don't have any health potions!`]);
      return;
    }

    const healAmount = 20;
    const newHp = Math.min(currentPlayer.stats.maxHp, currentPlayer.stats.currentHp + healAmount);
    
    const updatedInventory = [...currentPlayer.inventory];
    updatedInventory[potionIndex].quantity -= 1;
    if (updatedInventory[potionIndex].quantity <= 0) {
      updatedInventory.splice(potionIndex, 1);
    }

    setCurrentPlayer({
      ...currentPlayer,
      stats: { ...currentPlayer.stats, currentHp: newHp },
      inventory: updatedInventory,
    });
    
    setCombatLog([...combatLog, `You use a health potion and recover ${healAmount} HP!`]);
    setIsPlayerTurn(false);
    setTimeout(() => enemyTurn(), 1000);
  };

  const handleFlee = () => {
    if (!isPlayerTurn || combatEnded) return;

    const fleeChance = 0.3 + (currentPlayer.stats.agility * 0.05);
    if (Math.random() < fleeChance) {
      setCombatLog([...combatLog, `You successfully flee from combat!`]);
      setCombatEnded(true);
      setTimeout(() => onCombatEnd('defeat', currentPlayer), 1500);
    } else {
      setCombatLog([...combatLog, `You failed to flee!`]);
      setIsPlayerTurn(false);
      setTimeout(() => enemyTurn(), 1000);
    }
  };

  const enemyTurn = (playerDefending = false) => {
    const damage = calculateDamage(currentEnemy.attack, currentPlayer.stats.agility);
    const actualDamage = playerDefending ? Math.floor(damage / 2) : damage;
    const newPlayerHp = Math.max(0, currentPlayer.stats.currentHp - actualDamage);
    
    setCurrentPlayer({
      ...currentPlayer,
      stats: { ...currentPlayer.stats, currentHp: newPlayerHp },
    });
    
    setCombatLog(prev => [...prev, `${currentEnemy.name} attacks for ${actualDamage} damage!${playerDefending ? ' (Defended)' : ''}`]);

    if (newPlayerHp <= 0) {
      setCombatLog(prev => [...prev, `You have been defeated...`]);
      setCombatEnded(true);
      setTimeout(() => onCombatEnd('defeat', { ...currentPlayer, stats: { ...currentPlayer.stats, currentHp: 1 } }), 2000);
      return;
    }

    setIsPlayerTurn(true);
  };

  const potionCount = currentPlayer.inventory.filter(i => i.type === 'potion' && i.name.includes('Health')).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/50 to-gray-900 p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sword className="text-red-400" />
            Combat!
          </h2>
        </div>

        {/* Combat Arena */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Enemy Stats */}
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Skull className="text-red-400" />
                <h3 className="font-bold text-white text-lg">{currentEnemy.name}</h3>
              </div>
              <div className="text-sm text-gray-400">
                ATK: {currentEnemy.attack} | DEF: {currentEnemy.defense}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-400">HP</span>
                <span className="text-white">{currentEnemy.hp}/{currentEnemy.maxHp}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                  style={{ width: `${(currentEnemy.hp / currentEnemy.maxHp) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Player Stats */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="text-blue-400" />
                <h3 className="font-bold text-white text-lg">{currentPlayer.name}</h3>
              </div>
              <div className="text-sm text-gray-400">
                Level {currentPlayer.level}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-400">HP</span>
                <span className="text-white">{currentPlayer.stats.currentHp}/{currentPlayer.stats.maxHp}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                  style={{ width: `${(currentPlayer.stats.currentHp / currentPlayer.stats.maxHp) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Combat Log */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
            <h4 className="text-sm font-bold text-gray-400 mb-2">Combat Log</h4>
            <div className="space-y-1">
              {combatLog.map((log, i) => (
                <div key={i} className="text-sm text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!combatEnded && (
          <div className="border-t border-gray-700 p-4 bg-gray-800/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={handleAttack}
                disabled={!isPlayerTurn}
                className="bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Sword className="w-4 h-4" />
                Attack
              </button>
              <button
                onClick={handleDefend}
                disabled={!isPlayerTurn}
                className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Defend
              </button>
              <button
                onClick={handleUsePotion}
                disabled={!isPlayerTurn || potionCount === 0}
                className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4" />
                Potion ({potionCount})
              </button>
              <button
                onClick={handleFlee}
                disabled={!isPlayerTurn}
                className="bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Flee
              </button>
            </div>
            {!isPlayerTurn && !combatEnded && (
              <div className="text-center text-sm text-gray-400 mt-2">
                Enemy's turn...
              </div>
            )}
          </div>
        )}

        {/* Victory/Defeat */}
        {combatEnded && (
          <div className="border-t border-gray-700 p-6 bg-gray-800/50 text-center">
            {currentEnemy.hp <= 0 ? (
              <div>
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-amber-400 mb-2">Victory!</h3>
                <p className="text-gray-300">You defeated the {currentEnemy.name}!</p>
              </div>
            ) : (
              <div>
                <Skull className="w-16 h-16 text-red-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-red-400 mb-2">Defeated</h3>
                <p className="text-gray-300">You have fallen in battle...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
