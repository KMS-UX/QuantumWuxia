import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LLMConfig } from '../types/game';
import { Wifi, WifiOff, Server, Cloud, Monitor, Settings as SettingsIcon, RefreshCw, RotateCcw, ChevronDown, ChevronUp, Info, Download, FileText } from 'lucide-react';

const PROVIDERS = [
  {
    id: 'ollama' as const,
    name: 'Ollama (Local)',
    icon: '🖥️',
    description: 'Run models locally on your device',
    defaultUrl: 'http://localhost:11434',
    models: ['llama3', 'llama3.1', 'mistral', 'mixtral', 'codellama', 'gemma', 'phi3', 'qwen2'],
    needsApiKey: false,
  },
  {
    id: 'lmstudio' as const,
    name: 'LM Studio (Local)',
    icon: '🧪',
    description: 'Local model server with OpenAI-compatible API',
    defaultUrl: 'http://localhost:1234',
    models: ['local-model'],
    needsApiKey: false,
  },
  {
    id: 'openai' as const,
    name: 'OpenAI (Cloud)',
    icon: '🤖',
    description: 'GPT-4, GPT-3.5 and other OpenAI models',
    defaultUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    needsApiKey: true,
  },
  {
    id: 'custom' as const,
    name: 'Custom Endpoint',
    icon: '🔧',
    description: 'Any OpenAI-compatible API endpoint',
    defaultUrl: 'http://localhost:8080',
    models: ['custom'],
    needsApiKey: false,
  },
];

export default function SettingsPanel() {
  const { settings, updateSettings, testLLMConnection, connectionStatus, connectionMessage, resetGame, gameState } = useGameStore();
  const [config, setConfig] = useState<LLMConfig>(settings.llmConfig);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const exportGameLog = () => {
    if (!gameState.character || gameState.turns.length === 0) {
      alert('No game log to export. Start a game first!');
      return;
    }

    const character = gameState.character;
    let log = `═══════════════════════════════════════════════════════════\n`;
    log += `  REALM OF ECHOES - ADVENTURE LOG\n`;
    log += `═══════════════════════════════════════════════════════════\n\n`;
    log += `Character: ${character.name}\n`;
    log += `Race: ${character.race} | Class: ${character.class}\n`;
    log += `Level: ${character.level} | Gold: ${character.gold}\n`;
    log += `Location: ${gameState.location}\n`;
    log += `Total Turns: ${gameState.turnCount}\n`;
    log += `Date: ${new Date().toLocaleString()}\n\n`;
    log += `───────────────────────────────────────────────────────────\n\n`;

    gameState.turns.forEach((turn, index) => {
      log += `【 TURN ${index + 1} 】\n\n`;
      log += `${turn.narrative}\n\n`;
      if (turn.playerAction) {
        log += `▶ You: ${turn.playerAction}\n\n`;
      }
      log += `───────────────────────────────────────────────────────────\n\n`;
    });

    log += `\n═══════════════════════════════════════════════════════════\n`;
    log += `  END OF LOG\n`;
    log += `═══════════════════════════════════════════════════════════\n`;

    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realm-of-echoes-${character.name}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedProvider = PROVIDERS.find(p => p.id === config.provider) || PROVIDERS[0];

  const handleProviderChange = (providerId: LLMConfig['provider']) => {
    const provider = PROVIDERS.find(p => p.id === providerId)!;
    setConfig({
      ...config,
      provider: providerId,
      baseUrl: provider.defaultUrl,
      model: provider.models[0],
      apiKey: provider.needsApiKey ? config.apiKey : undefined,
    });
  };

  const handleSave = () => {
    updateSettings({ llmConfig: config });
  };

  const handleTest = async () => {
    setIsTesting(true);
    updateSettings({ llmConfig: config });
    await testLLMConnection();
    setIsTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <SettingsIcon className="text-amber-400" />
              Settings
            </h1>
            <p className="text-gray-400 mt-1">Configure your AI Game Master</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
              connectionStatus === 'connected' ? 'bg-green-900/30 text-green-400 border border-green-700' :
              connectionStatus === 'connecting' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' :
              connectionStatus === 'error' ? 'bg-red-900/30 text-red-400 border border-red-700' :
              'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> :
               connectionStatus === 'connecting' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
               <WifiOff className="w-3 h-3" />}
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Testing...' :
               connectionStatus === 'error' ? 'Error' : 'Disconnected'}
            </div>
          </div>
        </div>

        {/* Hybrid Mode Info */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-300 text-sm">Hybrid LLM Mode</h3>
              <p className="text-xs text-gray-400 mt-1">
                This game supports both <strong className="text-blue-300">cloud-hosted</strong> (OpenAI) and{' '}
                <strong className="text-green-300">local on-device</strong> (Ollama, LM Studio) language models. 
                Switch between providers at any time. Local models run entirely on your hardware — no data leaves your device.
              </p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Server className="text-amber-400" /> AI Provider
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  config.provider === provider.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-gray-700 bg-gray-900/30 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{provider.icon}</span>
                  <span className="font-bold text-white text-sm">{provider.name}</span>
                  {provider.id === 'ollama' || provider.id === 'lmstudio' ? (
                    <span className="text-xs bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded">Local</span>
                  ) : provider.id === 'openai' ? (
                    <span className="text-xs bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded">Cloud</span>
                  ) : (
                    <span className="text-xs bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">Custom</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{provider.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Monitor className="text-amber-400" /> Configuration
          </h2>
          
          <div className="space-y-4">
            {/* Base URL */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Server URL
                <span className="text-xs text-gray-500 ml-2">
                  {selectedProvider.id === 'ollama' ? '(Default: http://localhost:11434)' :
                   selectedProvider.id === 'lmstudio' ? '(Default: http://localhost:1234)' :
                   selectedProvider.id === 'openai' ? '(OpenAI API endpoint)' : '(Your custom endpoint)'}
                </span>
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Model</label>
              {selectedProvider.models.length > 1 ? (
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {selectedProvider.models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="Enter model name..."
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              )}
            </div>

            {/* Custom Model Input */}
            {selectedProvider.id !== 'ollama' && selectedProvider.id !== 'openai' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">Custom Model Name</label>
                <input
                  type="text"
                  value={customModel || config.model}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    setConfig({ ...config, model: e.target.value });
                  }}
                  placeholder="e.g., mistral-7b-instruct"
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* API Key */}
            {selectedProvider.needsApiKey && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">API Key</label>
                <input
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-gray-500 mt-1">Your API key is stored locally and never sent to our servers.</p>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl mb-6 overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cloud className="text-amber-400" /> Advanced Settings
            </h2>
            {showAdvanced ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          {showAdvanced && (
            <div className="p-6 pt-0 space-y-4">
              {/* Temperature */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Temperature: {config.temperature}
                  <span className="text-xs text-gray-500 ml-2">(Lower = more focused, Higher = more creative)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Max Response Length: {config.maxTokens} tokens
                </label>
                <input
                  type="range"
                  min="200"
                  max="4000"
                  step="100"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Narrative Style */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Narrative Style</label>
                <select
                  value={settings.narrativeStyle}
                  onChange={(e) => updateSettings({ narrativeStyle: e.target.value as any })}
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="detailed">Detailed - Rich descriptions and atmosphere</option>
                  <option value="concise">Concise - Quick and to the point</option>
                  <option value="dramatic">Dramatic - Theatrical and intense</option>
                </select>
              </div>

              {/* World Theme */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">World Theme</label>
                <select
                  value={settings.worldTheme}
                  onChange={(e) => updateSettings({ worldTheme: e.target.value as any })}
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="fantasy">🏰 High Fantasy</option>
                  <option value="sci-fi">🚀 Science Fiction</option>
                  <option value="horror">👻 Horror</option>
                  <option value="wuxia">⚔️ Wuxia (Martial Arts)</option>
                  <option value="custom">🎨 Custom</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Connection Test & Save */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all"
          >
            💾 Save Settings
          </button>
        </div>

        {/* Connection Result */}
        {connectionMessage && (
          <div className={`rounded-xl p-4 border mb-6 ${
            connectionStatus === 'connected'
              ? 'bg-green-900/20 border-green-700 text-green-300'
              : 'bg-red-900/20 border-red-700 text-red-300'
          }`}>
            <p className="text-sm">{connectionMessage}</p>
          </div>
        )}

        {/* Local Setup Help */}
        {(config.provider === 'ollama' || config.provider === 'lmstudio') && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Monitor className="text-green-400" /> Local Setup Guide
            </h3>
            
            {config.provider === 'ollama' && (
              <div className="space-y-3 text-sm text-gray-300">
                <p>To use Ollama for local AI narration:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Download Ollama from <a href="https://ollama.ai" target="_blank" className="text-blue-400 hover:underline">ollama.ai</a></li>
                  <li>Install and start the Ollama service</li>
                  <li>Pull a model: <code className="bg-gray-900 px-2 py-0.5 rounded text-amber-300">ollama pull llama3</code></li>
                  <li>The server runs on <code className="bg-gray-900 px-2 py-0.5 rounded text-amber-300">http://localhost:11434</code> by default</li>
                  <li>Click "Test Connection" to verify</li>
                </ol>
                <p className="text-xs text-gray-500 mt-2">Recommended models: llama3 (8B), mistral (7B), or mixtral for best quality.</p>
              </div>
            )}
            
            {config.provider === 'lmstudio' && (
              <div className="space-y-3 text-sm text-gray-300">
                <p>To use LM Studio for local AI narration:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Download LM Studio from <a href="https://lmstudio.ai" target="_blank" className="text-blue-400 hover:underline">lmstudio.ai</a></li>
                  <li>Download a model within LM Studio</li>
                  <li>Start the local server (click "Start Server" in the Local Server tab)</li>
                  <li>The server runs on <code className="bg-gray-900 px-2 py-0.5 rounded text-amber-300">http://localhost:1234</code> by default</li>
                  <li>Click "Test Connection" to verify</li>
                </ol>
                <p className="text-xs text-gray-500 mt-2">LM Studio provides a user-friendly interface for running local models.</p>
              </div>
            )}
          </div>
        )}

        {/* Export Game Log */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <FileText className="text-amber-400" /> Export Game Log
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Export your adventure as a text file to keep a record of your journey.
          </p>
          <button
            onClick={exportGameLog}
            className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Adventure Log
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/10 border border-red-800/50 rounded-xl p-6">
          <h3 className="font-bold text-red-400 mb-3">⚠️ Danger Zone</h3>
          <p className="text-sm text-gray-400 mb-3">
            Reset your game and start a new adventure. This cannot be undone.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset? All progress will be lost.')) {
                resetGame();
              }
            }}
            className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}
