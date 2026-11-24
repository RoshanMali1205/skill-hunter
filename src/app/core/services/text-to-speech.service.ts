import { Injectable, inject, signal } from '@angular/core';
import { SettingsService } from './settings.service';
import {
  chunkSpeechText,
  normalizeSpeechRate,
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
 * A quiet pause/resume every few seconds keeps a long answer from dying the
 * same way. Pausing is the second click, so a learner can stop and pick up
 * an interview answer without losing their place.
 */
@Injectable({ providedIn: 'root' })
export class TextToSpeechService {
  private readonly settings = inject(SettingsService);

  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  private readonly _speakingId = signal<string | null>(null);
  readonly speakingId = this._speakingId.asReadonly();

  private readonly _paused = signal(false);
  readonly paused = this._paused.asReadonly();

  private readonly _voices = signal<SpeechSynthesisVoice[]>([]);
  /** English voices when available, best quality first. */
  readonly voices = this._voices.asReadonly();

  /** Bumps on every new playback or stop so late events from an old clip are ignored. */
  private generation = 0;
  /** Chrome stops a queued narration after about 15 seconds unless it is nudged. */
  private keepAliveId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (!this.supported) return;
    this.refreshVoices();
    const refresh = () => this.refreshVoices();
    // Firefox often misses the property and only fires the event listener.
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    window.speechSynthesis.onvoiceschanged = refresh;
  }

  speak(id: string, text: string): void {
    if (!this.supported) return;
    const chunks = chunkSpeechText(text);
    if (chunks.length === 0) return;

    this.generation += 1;
    const generation = this.generation;
    window.speechSynthesis.cancel();
    const rate = normalizeSpeechRate(this.settings.settings().speechRate);
    this._paused.set(false);
    this._speakingId.set(id);

    // Chrome drops an utterance that is queued in the same turn as cancel().
    // The voice is chosen inside that turn so a list that arrives late is used,
    // instead of leaving Edge on its child default.
    window.setTimeout(() => {
      if (generation !== this.generation) return;
      this.refreshVoices();
      const voice = pickSpeechVoice(
        this._voices(),
        this.savedVoiceId(),
        typeof navigator !== 'undefined' ? navigator.language : undefined,
      );
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || 'en-US';
        } else {
          utterance.lang = 'en-US';
        }
        utterance.rate = rate;
        utterance.pitch = 1;
        const last = index === chunks.length - 1;
        utterance.onend = () => this.onChunkEnd(generation, last);
        utterance.onerror = (event) => this.onChunkError(generation, event?.error);
        window.speechSynthesis.speak(utterance);
      });
      if (this._paused()) {
        window.speechSynthesis.pause();
      } else {
        this.armKeepAlive(generation);
      }
    }, 0);
  }

  stop(): void {
    if (!this.supported) return;
    this.generation += 1;
    this.clearKeepAlive();
    window.speechSynthesis.cancel();
    this._paused.set(false);
    this._speakingId.set(null);
  }

  /**
   * Same item pauses and resumes so a long answer can be interrupted.
   * A different item replaces whatever is playing.
   */
  toggle(id: string, text: string): void {
    if (this._speakingId() === id) {
      if (this._paused()) this.resumePlayback();
      else this.pausePlayback();
    } else {
      this.speak(id, text);
    }
  }

  private pausePlayback(): void {
    if (!this.supported || this._speakingId() === null || this._paused()) return;
    this._paused.set(true);
    this.clearKeepAlive();
    window.speechSynthesis.pause();
  }

  private resumePlayback(): void {
    if (!this.supported || !this._paused()) return;
    this._paused.set(false);
    window.speechSynthesis.resume();
    this.armKeepAlive(this.generation);
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
    this.clearKeepAlive();
    this._paused.set(false);
    this._speakingId.set(null);
  }

  private onChunkError(generation: number, error?: string): void {
    if (generation !== this.generation) return;
    // pause(), resume(), and cancel() surface as interrupted or canceled.
    if (error === 'interrupted' || error === 'canceled') return;
    this.generation += 1;
    this.clearKeepAlive();
    try {
      window.speechSynthesis.cancel();
    } catch {
      // The browser already aborted the queue.
    }
    this._paused.set(false);
    this._speakingId.set(null);
  }

  private armKeepAlive(generation: number): void {
    this.clearKeepAlive();
    this.keepAliveId = setInterval(() => {
      if (generation !== this.generation || this._paused()) {
        if (generation !== this.generation) this.clearKeepAlive();
        return;
      }
      try {
        const synth = window.speechSynthesis;
        if (!synth.speaking || synth.paused) return;
        synth.pause();
        synth.resume();
      } catch {
        this.clearKeepAlive();
      }
    }, 10_000);
  }

  private clearKeepAlive(): void {
    if (this.keepAliveId === null) return;
    clearInterval(this.keepAliveId);
    this.keepAliveId = null;
  }
}
