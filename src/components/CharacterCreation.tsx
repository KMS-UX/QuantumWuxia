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

  const optionClass = 'jianghu-option';

  return (
    <main className="jianghu-creation">
      <div className="jianghu-creation__frame">
        <header className="mb-7 text-center">
          <p className="jianghu-eyebrow">THE NINE RIVERS · CHARACTER ENTRY</p>
          <h1 className="jianghu-creation__brand">
            QuantumWuxia
          </h1>
          <p className="jianghu-creation__subtitle">An AI-narrated Wuxia simulation in the Nine Rivers Jianghu</p>
          <p className="mt-2 text-xs text-gray-400">
            LLM: {settings.llmConfig.provider} / {settings.llmConfig.model}
          </p>
        </header>

        <div className="jianghu-steps" aria-label={`Step ${step} of 2`}>
          {[1, 2].map(s => (
            <span key={s} aria-current={s === step ? 'step' : undefined} />
          ))}
        </div>

        <section className="jianghu-creation__panel px-5 py-6 sm:px-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="jianghu-creation__heading flex items-center gap-2">
                <Sparkles className="text-amber-300" /> Name and world
              </h2>
              <div>
                <label className="mb-2 block text-sm text-gray-300">Character name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Choose the name you will carry..."
                  maxLength={48}
                  className="jianghu-field"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-gray-300">What is possible in this world?</label>
                <div className="jianghu-option-grid">
                  {(Object.keys(PRESET_COPY) as PresetId[]).map(id => (
                    <button key={id} onClick={() => choosePreset(id)} className={optionClass} aria-pressed={presetId === id}>
                      <div className="jianghu-option__title">{PRESET_COPY[id].title}</div>
                      <div className="jianghu-option__detail">{PRESET_COPY[id].description}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="jianghu-button jianghu-button--primary w-full"
              >
                Choose your origin <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="jianghu-creation__heading flex items-center gap-2">
                <Sword className="text-emerald-200" /> Choose your origin
              </h2>
              <div className="jianghu-option-grid jianghu-option-grid--origins">
                {origins.map(origin => (
                  <button key={origin.id} onClick={() => setOriginId(origin.id)} className="jianghu-option" aria-pressed={originId === origin.id}>
                    <div className="jianghu-option__title">
                      {origin.title} <span className="text-gray-500 font-normal">{origin.zh}</span>
                    </div>
                    <div className="jianghu-option__detail">{origin.summary}</div>
                    <div className="mt-2 text-xs text-emerald-200">{origin.startLocationId}</div>
                  </button>
                ))}
              </div>
              <div className="jianghu-origin-summary">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-white">
                  <Dices className="text-amber-300" /> The situation
                </h3>
                <p className="text-sm text-gray-300">{selectedOrigin.hook}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {name.trim() || 'Wanderer'} · {PRESET_COPY[presetId].title}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="jianghu-button flex-1"
                >
                  <span aria-hidden="true">←</span> Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="jianghu-button jianghu-button--primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Entering the Jianghu...' : 'Begin journey'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
