// Sound Manager using Web Audio API - no external dependencies needed
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  init() {
    if (typeof window === 'undefined') return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', fadeOut: boolean = true) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
      if (fadeOut) {
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      }

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Silently fail
    }
  }

  private playSequence(notes: Array<{ freq: number; duration: number; type?: OscillatorType; delay?: number }>) {
    if (!this.enabled || !this.audioContext) return;

    const ctx = this.audioContext;
    let currentTime = ctx.currentTime;
    notes.forEach(note => {
      currentTime += (note.delay || 0);
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = note.type || 'sine';
      oscillator.frequency.value = note.freq;

      gainNode.gain.setValueAtTime(this.volume, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + note.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + note.duration);
      currentTime += note.duration;
    });
  }

  // Sound effects
  choiceSelect() {
    this.playTone(600, 0.1, 'sine');
  }

  choiceConfirm() {
    this.playSequence([
      { freq: 523, duration: 0.08, type: 'sine' },
      { freq: 659, duration: 0.08, type: 'sine', delay: 0.05 },
      { freq: 784, duration: 0.15, type: 'sine', delay: 0.05 },
    ]);
  }

  intentSubmit() {
    this.playSequence([
      { freq: 440, duration: 0.1, type: 'triangle' },
      { freq: 660, duration: 0.15, type: 'triangle', delay: 0.08 },
    ]);
  }

  levelUp() {
    this.playSequence([
      { freq: 523, duration: 0.12, type: 'sine' },
      { freq: 659, duration: 0.12, type: 'sine', delay: 0.1 },
      { freq: 784, duration: 0.12, type: 'sine', delay: 0.1 },
      { freq: 1047, duration: 0.3, type: 'sine', delay: 0.1 },
    ]);
  }

  achievement() {
    this.playSequence([
      { freq: 784, duration: 0.1, type: 'triangle' },
      { freq: 988, duration: 0.1, type: 'triangle', delay: 0.1 },
      { freq: 1175, duration: 0.1, type: 'triangle', delay: 0.1 },
      { freq: 1319, duration: 0.3, type: 'triangle', delay: 0.1 },
    ]);
  }

  itemGained() {
    this.playSequence([
      { freq: 880, duration: 0.08, type: 'sine' },
      { freq: 1175, duration: 0.15, type: 'sine', delay: 0.08 },
    ]);
  }

  damage() {
    this.playTone(150, 0.2, 'sawtooth');
  }

  heal() {
    this.playSequence([
      { freq: 440, duration: 0.1, type: 'sine' },
      { freq: 554, duration: 0.1, type: 'sine', delay: 0.08 },
      { freq: 659, duration: 0.2, type: 'sine', delay: 0.08 },
    ]);
  }

  death() {
    this.playSequence([
      { freq: 440, duration: 0.3, type: 'sawtooth' },
      { freq: 220, duration: 0.3, type: 'sawtooth', delay: 0.25 },
      { freq: 110, duration: 0.6, type: 'sawtooth', delay: 0.25 },
    ]);
  }

  diceRoll() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playTone(300 + Math.random() * 400, 0.05, 'square');
      }, i * 60);
    }
  }

  notification() {
    this.playSequence([
      { freq: 880, duration: 0.08, type: 'sine' },
      { freq: 1100, duration: 0.12, type: 'sine', delay: 0.08 },
    ]);
  }

  buttonClick() {
    this.playTone(800, 0.05, 'sine');
  }

  menuOpen() {
    this.playSequence([
      { freq: 400, duration: 0.08, type: 'sine' },
      { freq: 600, duration: 0.1, type: 'sine', delay: 0.05 },
    ]);
  }

  menuClose() {
    this.playSequence([
      { freq: 600, duration: 0.08, type: 'sine' },
      { freq: 400, duration: 0.1, type: 'sine', delay: 0.05 },
    ]);
  }

  save() {
    this.playSequence([
      { freq: 523, duration: 0.1, type: 'triangle' },
      { freq: 659, duration: 0.15, type: 'triangle', delay: 0.1 },
    ]);
  }

  error() {
    this.playSequence([
      { freq: 200, duration: 0.15, type: 'square' },
      { freq: 150, duration: 0.2, type: 'square', delay: 0.15 },
    ]);
  }
}

export const soundManager = new SoundManager();

// React hook for sound
import { useEffect, useState } from 'react';

export function useSound() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    soundManager.init();
    const stored = localStorage.getItem('sound-enabled');
    if (stored !== null) {
      const isEnabled = stored === 'true';
      setEnabled(isEnabled);
      soundManager.setEnabled(isEnabled);
    }
  }, []);

  const toggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    soundManager.setEnabled(newValue);
    localStorage.setItem('sound-enabled', String(newValue));
  };

  return { enabled, toggle, sound: soundManager };
}
