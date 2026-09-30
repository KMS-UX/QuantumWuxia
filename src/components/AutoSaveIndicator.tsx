import { useState, useEffect } from 'react';
import { Check, Save } from 'lucide-react';

interface AutoSaveIndicatorProps {
  lastSaved: number | null;
  isSaving: boolean;
}

export default function AutoSaveIndicator({ lastSaved, isSaving }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  if (isSaving) {
    return (
      <div className="fixed top-20 right-4 z-40 bg-gray-800 border border-amber-700/50 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 animate-pulse">
        <Save className="w-4 h-4 text-amber-400 animate-bounce" />
        <span className="text-sm text-amber-300">Saving...</span>
      </div>
    );
  }

  if (showSaved) {
    return (
      <div className="fixed top-20 right-4 z-40 bg-gray-800 border border-green-700/50 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 animate-fade-in">
        <Check className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-300">Auto-saved</span>
      </div>
    );
  }

  return null;
}
