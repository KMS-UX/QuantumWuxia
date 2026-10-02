import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: string;
  icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Quantum Wuxia',
    content: 'This is an AI-powered text RPG where every turn is narrated by artificial intelligence. Your choices shape the story in unique ways.',
    icon: '⚔️',
  },
  {
    title: 'Making Choices',
    content: 'Each turn presents 5 numbered choices. Click any choice to proceed. Green = safe, Yellow = risky, Red = dangerous.',
    icon: '🎯',
  },
  {
    title: 'Free Intent System',
    content: 'Don\'t like the choices? Type what you want to do in the text box below. The simulation resolves your action; the narrator describes the confirmed result.',
    icon: '🔮',
  },
  {
    title: 'Your Character',
    content: 'Track your health, Qi, fatigue, cultivation, martial arts, and injuries in your character record.',
    icon: '🧙',
  },
  {
    title: 'Save Your Progress',
    content: 'Click the 💾 Save button in the header to create save slots. You can have multiple saves and export your adventure log.',
    icon: '💾',
  },
  {
    title: 'AI Configuration',
    content: 'Click the gear icon to configure your AI provider. Use local models (Ollama/LM Studio) for privacy, or cloud models (OpenAI) for best quality.',
    icon: '⚙️',
  },
  {
    title: 'Keyboard Shortcuts',
    content: 'Press 1-5 to quickly select choices. Press Enter to submit your intent. Press Esc to close modals.',
    icon: '⌨️',
  },
  {
    title: 'Ready to Play!',
    content: 'You\'re all set! Remember: every action has consequences, the world remembers what you do, and there are no wrong choices—only different stories.',
    icon: '🎮',
  },
];

interface TutorialProps {
  onComplete: () => void;
  onSkip: () => void;
  wuxia?: boolean;
}

export default function Tutorial({ onComplete, onSkip, wuxia = false }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = wuxia ? TUTORIAL_STEPS.map((step, index) => {
    if (index === 0) return { ...step, title: 'Welcome to Quantum Wuxia', content: 'Enter the Nine Rivers Jianghu: a persistent world of martial traditions, shifting ties, rumors, and consequence.' };
    if (index === 2) return { ...step, content: 'Type an action in your own words. The simulation validates and resolves it; the narrator describes the confirmed result.' };
    if (index === 3) return { ...step, title: 'Your cultivation', content: 'Track health, Qi, fatigue, Face, learned arts, technique mastery, and injuries in your character record.' };
    return step;
  }) : TUTORIAL_STEPS;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className={`${wuxia ? 'jianghu-overlay' : 'bg-black/80'} fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm`}>
      <div className={`max-w-2xl w-full overflow-hidden border shadow-2xl ${wuxia ? 'border-white/20 bg-[#17231e]' : 'rounded-2xl border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800'}`}>
        {/* Header */}
        <div className={`p-6 border-b border-gray-700 ${wuxia ? 'bg-emerald-950/40' : 'bg-gradient-to-r from-amber-900/30 to-purple-900/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{step.icon}</div>
              <div>
                <h2 className="text-2xl font-bold text-white">{step.title}</h2>
                <div className="text-sm text-gray-400 mt-1">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700/50 transition-all"
              title="Skip tutorial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-lg text-gray-300 leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-8 pb-4">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= currentStep ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={currentStep === steps.length - 1 ? onComplete : handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-lg transition-all"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <Check className="w-4 h-4" />
                Start Playing
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip link */}
        <div className="text-center pb-4">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}
