import { Injectable, inject, signal } from '@angular/core';
import { SettingsService } from './settings.service';
import {
  chunkSpeechText,
  normalizeSpeechVoiceUri,
  pickSpeechVoice,
  voicesForSpeech,
} from './speech-text';

/** Id used by the Settings preview, so leaving the page can stop just that clip. */
export const SPEECH_PREVIEW_ID = 'settings-preview';

/**
 * Browser speech for the Listen button.
 *
 * The platform default voice is often robotic. We pick a better English voice
 * the browser already has (Edge Natural, Chrome Google, Safari Enhanced) unless
 * the learner chose one in Settings. Long topics are spoken sentence by
 * sentence because Chrome cuts off a single utterance after about 15 seconds.
 */
@Injectable({ providedIn: 'root' })
export class TextToSpeechService {
  private readonly settings = inject(SettingsService);

  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  private readonly _speakingId = signal<string | null>(null);
  readonly speakingId = this._speakingId.asReadonly();

  private readonly _voices = signal<SpeechSynthesisVoice[]>([]);
  /** English voices when available, best quality first. */
  readonly voices = this._voices.asReadonly();

  /** Bumps on every new playback or stop so late events from an old clip are ignored. */
  private generation = 0;

  constructor() {
    if (!this.supported) return;
    this.refreshVoices();
    window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
  }

  speak(id: string, text: string): void {
    if (!this.supported) return;
    const chunks = chunkSpeechText(text);
    if (chunks.length === 0) return;

    this.generation += 1;
    const generation = this.generation;
    window.speechSynthesis.cancel();
    // Chrome loads the voice list asynchronously; re-read it at speak time.
    this.refreshVoices();

    const voice = pickSpeechVoice(this._voices(), this.savedVoiceId());
    this._speakingId.set(id);

    // Chrome drops an utterance that is queued in the same turn as cancel().
    window.setTimeout(() => {
      if (generation !== this.generation) return;
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || 'en-US';
        } else {
          utterance.lang = 'en-US';
        }
        utterance.rate = 1;
        utterance.pitch = 1;
        const last = index === chunks.length - 1;
        utterance.onend = () => this.onChunkEnd(generation, last);
        utterance.onerror = () => this.onChunkError(generation);
        window.speechSynthesis.speak(utterance);
      });
    }, 0);
  }

  stop(): void {
    if (!this.supported) return;
    this.generation += 1;
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

  private savedVoiceId(): string | null {
    return normalizeSpeechVoiceUri(this.settings.settings().speechVoiceUri);
  }

  private refreshVoices(): void {
    if (!this.supported) return;
    let raw: SpeechSynthesisVoice[] = [];
    try {
      raw = window.speechSynthesis.getVoices?.() ?? [];
    } catch {
      raw = [];
    }

    const seen = new Set<string>();
    const unique: SpeechSynthesisVoice[] = [];
    for (const voice of raw) {
      if (!voice.name.trim()) continue;
      const id = voice.voiceURI.trim() || voice.name;
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(voice);
    }
    this._voices.set(voicesForSpeech(unique));
  }

  private onChunkEnd(generation: number, last: boolean): void {
    if (generation !== this.generation || !last) return;
    this._speakingId.set(null);
  }

  private onChunkError(generation: number): void {
    if (generation !== this.generation) return;
    this.generation += 1;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // The browser already aborted the queue.
    }
    this._speakingId.set(null);
  }
}
