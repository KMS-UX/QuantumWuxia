import { useState, useEffect } from 'react';

interface DiceRollProps {
  stat: string;
  statValue: number;
  difficulty: number;
  onComplete: (result: DiceRollResult) => void;
}

export interface DiceRollResult {
  roll: number;
  modifier: number;
  total: number;
  difficulty: number;
  success: boolean;
  critical: boolean;
  fumble: boolean;
  description: string;
}

export default function DiceRoll({ stat, statValue, difficulty, onComplete }: DiceRollProps) {
  const [rolling, setRolling] = useState(true);
  const [currentValue, setCurrentValue] = useState(1);
  const [finalResult, setFinalResult] = useState<DiceRollResult | null>(null);

  useEffect(() => {
    // Animate dice rolling
    const rollInterval = setInterval(() => {
      setCurrentValue(Math.floor(Math.random() * 20) + 1);
    }, 80);

    // Stop after animation
    const timeout = setTimeout(() => {
      clearInterval(rollInterval);
      
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + statValue;
      const success = total >= difficulty;
      const critical = roll === 20;
      const fumble = roll === 1;
      
      let description = '';
      if (critical) {
        description = '🌟 CRITICAL SUCCESS!';
      } else if (fumble) {
        description = '💀 CRITICAL FAILURE!';
      } else if (success && total >= difficulty + 10) {
        description = '✨ Outstanding success!';
      } else if (success) {
        description = '✅ Success!';
      } else if (total >= difficulty - 3) {
        description = '😓 Narrow failure...';
      } else {
        description = '❌ Failure';
      }

      const result: DiceRollResult = {
        roll,
        modifier: statValue,
        total,
        difficulty,
        success: success || critical,
        critical,
        fumble,
        description,
      };

      setFinalResult(result);
      setRolling(false);
      
      setTimeout(() => onComplete(result), 2000);
    }, 1500);

    return () => {
      clearInterval(rollInterval);
      clearTimeout(timeout);
    };
  }, [statValue, difficulty, onComplete]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <h3 className="text-lg font-bold text-white mb-2">
          {stat} Check
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          Difficulty: {difficulty}
        </p>

        {/* Dice */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className={`w-full h-full bg-white rounded-xl flex items-center justify-center shadow-lg ${rolling ? 'animate-bounce' : ''}`}>
            <span className={`text-4xl font-bold ${
              finalResult?.critical ? 'text-amber-500' :
              finalResult?.fumble ? 'text-red-500' :
              finalResult?.success ? 'text-green-600' : 'text-gray-800'
            }`}>
              {rolling ? currentValue : finalResult?.roll}
            </span>
          </div>
          {rolling && (
            <div className="absolute inset-0 rounded-xl border-2 border-amber-400 animate-ping opacity-50" />
          )}
        </div>

        {/* Result breakdown */}
        {!rolling && finalResult && (
          <div className="space-y-2 animate-fade-in">
            <div className="text-sm text-gray-300">
              🎲 Roll: <span className="font-bold text-white">{finalResult.roll}</span>
              {' + '}
              <span className="font-bold text-amber-400">{finalResult.modifier}</span>
              {' = '}
              <span className="font-bold text-white">{finalResult.total}</span>
            </div>
            
            <div className={`text-lg font-bold ${
              finalResult.critical ? 'text-amber-400' :
              finalResult.fumble ? 'text-red-400' :
              finalResult.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {finalResult.description}
            </div>
          </div>
        )}

        {rolling && (
          <div className="text-sm text-gray-400 animate-pulse">
            Rolling...
          </div>
        )}
      </div>
    </div>
  );
}

// Utility function to perform a dice roll without UI
export function performDiceRoll(statValue: number, difficulty: number): DiceRollResult {
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + statValue;
  const success = total >= difficulty;
  const critical = roll === 20;
  const fumble = roll === 1;
  
  let description = '';
  if (critical) {
    description = '🌟 CRITICAL SUCCESS!';
  } else if (fumble) {
    description = '💀 CRITICAL FAILURE!';
  } else if (success && total >= difficulty + 10) {
    description = '✨ Outstanding success!';
  } else if (success) {
    description = '✅ Success!';
  } else if (total >= difficulty - 3) {
    description = '😓 Narrow failure...';
  } else {
    description = '❌ Failure';
  }

  return {
    roll,
    modifier: statValue,
    total,
    difficulty,
    success: success || critical,
    critical,
    fumble,
    description,
  };
}
