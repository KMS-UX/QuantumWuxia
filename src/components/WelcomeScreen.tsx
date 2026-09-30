import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Settings, Zap, Cloud, Monitor, ArrowRight, Gamepad2 } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
  onSettings: () => void;
  onDemo: () => void;
}

export default function WelcomeScreen({ onStart, onSettings, onDemo }: WelcomeScreenProps) {
  const { settings } = useGameStore();
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-purple-900/30 flex flex-col items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-4">
            Realm of Echoes
          </h1>
          <p className="text-xl text-gray-400 mb-2">An AI-Powered Text RPG Adventure</p>
          <p className="text-sm text-gray-500">
            Type what you do. The world plays it out.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5 text-center">
            <div className="text-3xl mb-3">🎭</div>
            <h3 className="font-bold text-white mb-1">AI Narrator</h3>
            <p className="text-xs text-gray-400">Every turn is narrated by AI. Your choices shape the story in ways no pre-written game can.</p>
          </div>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5 text-center">
            <div className="text-3xl mb-3">🔮</div>
            <h3 className="font-bold text-white mb-1">Free Intent</h3>
            <p className="text-xs text-gray-400">Don't like the choices? Type what you want to do in your own words. The world responds.</p>
          </div>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5 text-center">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="font-bold text-white mb-1">Persistent World</h3>
            <p className="text-xs text-gray-400">Items, relationships, and events are tracked. Your actions have lasting consequences.</p>
          </div>
        </div>

        {/* Hybrid LLM Info */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-xl p-6 mb-8">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="text-amber-400 w-5 h-5" />
            Hybrid AI — Cloud or Local
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            Connect to any LLM backend — cloud-hosted or running locally on your device.
            Your adventure, your AI, your privacy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-gray-900/30 rounded-lg p-3">
              <Cloud className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Cloud Models</div>
                <div className="text-xs text-gray-400">OpenAI GPT-4o, GPT-4, GPT-3.5</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/30 rounded-lg p-3">
              <Monitor className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Local Models</div>
                <div className="text-xs text-gray-400">Ollama, LM Studio (Llama, Mistral, etc.)</div>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Current: <span className="text-amber-400">{settings.llmConfig.provider}</span> / <span className="text-amber-400">{settings.llmConfig.model}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onStart}
            className="group bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <Gamepad2 className="w-5 h-5" />
            Start New Adventure
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={onDemo}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
          >
            🎲 Try Demo (No LLM)
          </button>
          
          <button
            onClick={onSettings}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Configure AI
          </button>
        </div>

        {/* Quick Setup */}
        {showSetup && (
          <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="font-bold text-white mb-3">⚡ Quick Setup</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <span className="bg-amber-500/20 text-amber-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p>Choose your AI provider: <strong className="text-green-400">Local</strong> (Ollama/LM Studio) for privacy, or <strong className="text-blue-400">Cloud</strong> (OpenAI) for best quality.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-amber-500/20 text-amber-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p>For local: Install Ollama from <a href="https://ollama.ai" target="_blank" className="text-blue-400 hover:underline">ollama.ai</a> and run <code className="bg-gray-900 px-1.5 py-0.5 rounded text-amber-300">ollama pull llama3</code></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-amber-500/20 text-amber-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p>Click "Test Connection" to verify, then start your adventure!</p>
              </div>
            </div>
          </div>
        )}

        {!showSetup && (
          <button
            onClick={() => setShowSetup(true)}
            className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors underline"
          >
            How do I set up an AI backend?
          </button>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-xs text-gray-600">
          <p>Realm of Echoes — A browser-based text RPG with hybrid AI support</p>
          <p className="mt-1">Supports OpenAI, Ollama, LM Studio, and custom endpoints</p>
        </div>
      </div>
    </div>
  );
}
