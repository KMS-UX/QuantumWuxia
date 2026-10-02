import { BookOpen, FolderOpen, Play, Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../services/soundManager';

interface MainMenuProps {
  hasSaveData: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onLoadGame: () => void;
  onSettings: () => void;
  onDemo: () => void;
}

export default function MainMenu({ hasSaveData, onNewGame, onContinue, onLoadGame, onSettings, onDemo }: MainMenuProps) {
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();

  return (
    <div className="jianghu-title">
      <div className="jianghu-title__backdrop" aria-hidden="true" />
      <div className="jianghu-title__shade" aria-hidden="true" />
      <div className="jianghu-title__frame">
        <header className="jianghu-title__bar">
          <div className="jianghu-title__signature"><span className="jianghu-title__seal">QW</span><span>THE NINE RIVERS</span></div>
          <div className="jianghu-title__tools">
            <button className="jianghu-icon-button" onClick={onSettings} title="Settings" aria-label="Settings"><SettingsIcon size={19} /></button>
            <button className="jianghu-icon-button" onClick={toggleSound} title={soundEnabled ? 'Turn sound off' : 'Turn sound on'} aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}>
              {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
          </div>
        </header>

        <main className="jianghu-title__main">
          <section className="jianghu-title__copy">
            <p className="jianghu-eyebrow">A LIVING JIANGHU · MARTIAL ARTS · CONSEQUENCE</p>
            <h1>Quantum <span>Wuxia</span></h1>
            <p className="jianghu-title__description">Take up a name, follow a rumor, cross blades, or make your own way through the Nine Rivers.</p>
            <div className="jianghu-title__rule"><span />The world moves with or without you<span /></div>
          </section>

          <nav className="jianghu-title__menu" aria-label="Main menu">
            {hasSaveData && (
              <button className="jianghu-menu-action" onClick={onContinue}>
                <Play size={18} /><span><strong>Continue journey</strong><small>Return to your current path</small></span>
              </button>
            )}
            <button className="jianghu-menu-action jianghu-menu-action--primary" onClick={onNewGame}>
              <BookOpen size={19} /><span><strong>Begin a new journey</strong><small>Choose an origin and enter the Jianghu</small></span>
            </button>
            <button className="jianghu-menu-action" onClick={onLoadGame}>
              <FolderOpen size={18} /><span><strong>Load a save</strong><small>Resume another life</small></span>
            </button>
            <button className="jianghu-menu-demo" onClick={onDemo}>Enter without an AI connection</button>
          </nav>
        </main>

        <footer className="jianghu-title__footer">
          <span>WUXIA FIRST</span><span>FANTASY BY CHOICE</span><span>YOUR ACTIONS LEAVE A TRACE</span>
        </footer>
      </div>
    </div>
  );
}
