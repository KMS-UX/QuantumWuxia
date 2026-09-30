import { useState } from 'react';
import { Dice5, X, Coins } from 'lucide-react';

interface MiniGamesProps {
  playerGold: number;
  onGoldChange: (amount: number) => void;
  onClose: () => void;
}

type GameType = 'dice' | 'coin' | null;

export default function MiniGames({ playerGold, onGoldChange, onClose }: MiniGamesProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Dice Game
  const playDiceGame = (playerChoice: 'high' | 'low') => {
    if (bet > playerGold || bet <= 0) return;
    
    setIsPlaying(true);
    setResult(null);

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const isHigh = roll >= 4;
      const won = (playerChoice === 'high' && isHigh) || (playerChoice === 'low' && !isHigh);

      if (won) {
        onGoldChange(bet);
        setResult(`🎲 Rolled ${roll}! You win ${bet}g!`);
      } else {
        onGoldChange(-bet);
        setResult(`🎲 Rolled ${roll}! You lose ${bet}g.`);
      }
      setIsPlaying(false);
    }, 1000);
  };

  // Coin Flip
  const playCoinFlip = (choice: 'heads' | 'tails') => {
    if (bet > playerGold || bet <= 0) return;
    
    setIsPlaying(true);
    setResult(null);

    setTimeout(() => {
      const flip = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = flip === choice;

      if (won) {
        onGoldChange(bet);
        setResult(`🪙 ${flip.toUpperCase()}! You win ${bet}g!`);
      } else {
        onGoldChange(-bet);
        setResult(`🪙 ${flip.toUpperCase()}! You lose ${bet}g.`);
      }
      setIsPlaying(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/30 to-gray-900 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Dice5 className="text-amber-400" />
              Games of Chance
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 font-bold">{playerGold}g</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedGame ? (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white mb-3">Choose a Game</h3>
              
              <button
                onClick={() => setSelectedGame('dice')}
                className="w-full border-2 border-gray-700 rounded-lg p-4 text-left hover:border-amber-500 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🎲</div>
                  <div>
                    <h4 className="font-bold text-white">High/Low Dice</h4>
                    <p className="text-sm text-gray-400">Bet on whether the roll will be high (4-6) or low (1-3)</p>
                    <p className="text-xs text-amber-400 mt-1">Payout: 2x</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedGame('coin')}
                className="w-full border-2 border-gray-700 rounded-lg p-4 text-left hover:border-amber-500 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🪙</div>
                  <div>
                    <h4 className="font-bold text-white">Coin Flip</h4>
                    <p className="text-sm text-gray-400">Call heads or tails</p>
                    <p className="text-xs text-amber-400 mt-1">Payout: 2x</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => { setSelectedGame(null); setResult(null); }}
                className="text-sm text-gray-400 hover:text-white mb-4"
              >
                ← Back to games
              </button>

              {/* Bet Selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Bet Amount</label>
                <div className="flex gap-2">
                  {[5, 10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBet(amount)}
                      disabled={amount > playerGold}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        bet === amount
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {amount}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Area */}
              {selectedGame === 'dice' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white text-center">High/Low Dice</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => playDiceGame('low')}
                      disabled={isPlaying || bet > playerGold}
                      className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all"
                    >
                      <div className="text-2xl mb-1">🎲</div>
                      <div>Low (1-3)</div>
                    </button>
                    <button
                      onClick={() => playDiceGame('high')}
                      disabled={isPlaying || bet > playerGold}
                      className="bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all"
                    >
                      <div className="text-2xl mb-1">🎲</div>
                      <div>High (4-6)</div>
                    </button>
                  </div>
                </div>
              )}

              {selectedGame === 'coin' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white text-center">Coin Flip</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => playCoinFlip('heads')}
                      disabled={isPlaying || bet > playerGold}
                      className="bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all"
                    >
                      <div className="text-2xl mb-1">🪙</div>
                      <div>Heads</div>
                    </button>
                    <button
                      onClick={() => playCoinFlip('tails')}
                      disabled={isPlaying || bet > playerGold}
                      className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all"
                    >
                      <div className="text-2xl mb-1">🪙</div>
                      <div>Tails</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`mt-4 p-4 rounded-lg text-center ${
                  result.includes('win') ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
                }`}>
                  <p className="text-lg font-bold text-white">{result}</p>
                </div>
              )}

              {isPlaying && (
                <div className="mt-4 text-center text-gray-400 animate-pulse">
                  Rolling...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
