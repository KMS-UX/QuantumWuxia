import { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey) {
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const shortcuts = [
    { keys: '1-5', description: 'Select choice' },
    { keys: 'Enter', description: 'Submit intent' },
    { keys: 'Esc', description: 'Close modals' },
    { keys: 'Shift + ?', description: 'Toggle this help' },
    { keys: 'Ctrl + S', description: 'Quick save' },
    { keys: 'Ctrl + L', description: 'Quick load' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 bg-gray-800 border border-gray-700 hover:border-amber-500 text-gray-400 hover:text-amber-400 p-3 rounded-full transition-all shadow-lg z-40"
        title="Keyboard shortcuts (Shift + ?)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl min-w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400" />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <kbd className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-amber-400 font-mono">
                {shortcut.keys}
              </kbd>
              <span className="text-sm text-gray-300">{shortcut.description}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
          Press Shift + ? to toggle
        </div>
      </div>
    </div>
  );
}
