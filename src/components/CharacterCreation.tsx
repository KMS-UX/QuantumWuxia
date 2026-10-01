import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Sparkles, Sword, Dices } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { FANTASY_PRESETS, createOriginCharacter, originsFor, supernaturalEnabled } from '../world/content';

type PresetId = keyof typeof FANTASY_PRESETS;

const PRESET_COPY: Record<PresetId, { title: string; description: string }> = {
  pure_wuxia: { title: 'Pure Wuxia', description: 'Martial skill, trickery and superstition only. No supernatural elements.' },
  hidden_arcana: { title: 'Hidden Arcana', description: 'Illusion arts and cursed texts exist, but proof is rare and costly.' },
  living_legends: { title: 'Living Legends', description: 'Spirits, relics and moonwell visions are real, and every power has a price.' },
};

export default function CharacterCreation() {
  const { startNewGame, settings } = useGameStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [presetId, setPresetId] = useState<PresetId>('living_legends');
  const origins = originsFor(supernaturalEnabled(FANTASY_PRESETS[presetId]));
  const [originId, setOriginId] = useState(origins[0].id);
  const [isCreating, setIsCreating] = useState(false);

  const selectedOrigin = origins.find(o => o.id === originId) ?? origins[0];

  const choosePreset = (id: PresetId) => {
    setPresetId(id);
    const available = originsFor(supernaturalEnabled(FANTASY_PRESETS[id]));
    if (!available.some(o => o.id === originId)) setOriginId(available[0].id);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    await startNewGame(createOriginCharacter(selectedOrigin, name, uuidv4(), presetId));
    setIsCreating(false);
  };

  const cardClass = (selected: boolean) =>
    `p-4 rounded-xl border-2 transition-all text-left ${
      selected ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 bg-gray-900/30 hover:border-gray-500'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-500 mb-2">
            QuantumWuxia
          </h1>
          <p className="text-gray-400 text-lg">An AI-narrated Wuxia simulation in the Nine Rivers Jianghu</p>
          <p className="text-gray-500 text-sm mt-1">
            LLM: {settings.llmConfig.provider} / {settings.llmConfig.model}
          </p>
        </div>

        <div className="flex justify-center mb-8 gap-2">
          {[1, 2].map(s => (
            <div key={s} className={`h-2 w-16 rounded-full transition-all ${s <= step ? 'bg-amber-500' : 'bg-gray-700'}`} />
          ))}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-amber-400" /> Name and World
              </h2>
              <div>
                <label className="block text-gray-300 mb-2">Character Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">How much of the supernatural?</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(PRESET_COPY) as PresetId[]).map(id => (
                    <button key={id} onClick={() => choosePreset(id)} className={cardClass(presetId === id)}>
                      <div className="font-bold text-white">{PRESET_COPY[id].title}</div>
                      <div className="text-xs text-gray-400 mt-1">{PRESET_COPY[id].description}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all"
              >
                Next: Choose Your Origin →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sword className="text-blue-400" /> Choose Your Origin
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {origins.map(origin => (
                  <button key={origin.id} onClick={() => setOriginId(origin.id)} className={cardClass(originId === origin.id)}>
                    <div className="font-bold text-white">
                      {origin.title} <span className="text-gray-500 font-normal">{origin.zh}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{origin.summary}</div>
                    <div className="text-xs text-amber-400 mt-2">{origin.startLocationId}</div>
                  </button>
                ))}
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Dices className="text-amber-400" /> The Situation
                </h3>
                <p className="text-sm text-gray-300">{selectedOrigin.hook}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {name.trim() || 'Wanderer'} · {PRESET_COPY[presetId].title}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? '⏳ Entering the Jianghu...' : 'Begin Journey'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
