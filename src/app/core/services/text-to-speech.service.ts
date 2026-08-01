import { Injectable, signal } from '@angular/core';

/**
 * Thin wrapper around the browser's SpeechSynthesis API. speakingId tracks
 * *which* piece of content is currently being read (a topic id) so callers
 * can drive per-item play/stop UI without keeping their own state in sync.
 */
@Injectable({ providedIn: 'root' })
export class TextToSpeechService {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  private readonly _speakingId = signal<string | null>(null);
  readonly speakingId = this._speakingId.asReadonly();

  speak(id: string, text: string): void {
    if (!this.supported || !text.trim()) {
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => this.onUtteranceDone(id);
    utterance.onerror = () => this.onUtteranceDone(id);

    this._speakingId.set(id);
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (!this.supported) {
      return;
    }
    window.speechSynthesis.cancel();
    this._speakingId.set(null);
  }

  toggle(id: string, text: string): void {
    if (this._speakingId() === id) {
      this.stop();
    } else {
      this.speak(id, text);
    }
  }

  private onUtteranceDone(id: string): void {
    if (this._speakingId() === id) {
      this._speakingId.set(null);
    }
  }
}
