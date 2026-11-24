import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from './settings.service';
import { TextToSpeechService } from './text-to-speech.service';

class UtteranceDouble {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  constructor(readonly text: string) {}
}

function voice(name: string, lang = 'en-US', voiceURI = name): SpeechSynthesisVoice {
  return { name, lang, voiceURI, localService: true, default: false } as SpeechSynthesisVoice;
}

describe('TextToSpeechService', () => {
  const cancel = vi.fn();
  const speak = vi.fn();
  const getVoices = vi.fn<() => SpeechSynthesisVoice[]>(() => []);
  let speechDescriptor: PropertyDescriptor | undefined;
  let speechVoiceUri: string | null = null;

  beforeEach(() => {
    speechVoiceUri = null;
    speechDescriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel, speak, getVoices },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', UtteranceDouble);
    cancel.mockReset();
    speak.mockReset();
    getVoices.mockReset();
    getVoices.mockReturnValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (speechDescriptor) Object.defineProperty(window, 'speechSynthesis', speechDescriptor);
    else delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });

  function create(): TextToSpeechService {
    TestBed.configureTestingModule({
      providers: [
        TextToSpeechService,
        {
          provide: SettingsService,
          useValue: { settings: () => ({ speechVoiceUri }) },
        },
      ],
    });
    return TestBed.inject(TextToSpeechService);
  }

  /** speak() queues utterances on the next turn so Chrome can finish cancel(). */
  function flushSpeech(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('speaks non-empty text and tracks the active item', async () => {
    const service = create();
    service.speak('topic-1', 'Hello');
    expect(service.speakingId()).toBe('topic-1');
    await flushSpeech();
    expect(cancel).toHaveBeenCalledOnce();
    expect((speak.mock.calls[0]![0] as UtteranceDouble).text).toBe('Hello');
  });

  it('clears state when the last sentence ends, not when an earlier one ends', async () => {
    const service = create();
    service.speak('topic', 'First sentence. Second sentence.');
    await flushSpeech();
    expect(speak).toHaveBeenCalledTimes(2);
    const first = speak.mock.calls[0]![0] as UtteranceDouble;
    const second = speak.mock.calls[1]![0] as UtteranceDouble;
    expect(first.text).toBe('First sentence.');
    expect(second.text).toBe('Second sentence.');

    first.onend?.();
    expect(service.speakingId()).toBe('topic');
    second.onend?.();
    expect(service.speakingId()).toBeNull();
  });

  it('clears state when a chunk errors and ignores a stale event afterwards', async () => {
    const service = create();
    service.speak('one', 'First. Second.');
    await flushSpeech();
    const first = speak.mock.calls[0]![0] as UtteranceDouble;
    first.onerror?.();
    expect(service.speakingId()).toBeNull();
    first.onend?.();
    expect(service.speakingId()).toBeNull();
  });

  it('toggles the same item off and ignores blank text', async () => {
    const service = create();
    service.speak('one', '   ');
    await flushSpeech();
    expect(speak).not.toHaveBeenCalled();
    service.toggle('one', 'Read me');
    service.toggle('one', 'Read me');
    expect(service.speakingId()).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(2);
    await flushSpeech();
    expect(speak).not.toHaveBeenCalled();
  });

  it('chooses a natural English voice and applies a saved voice when present', async () => {
    getVoices.mockReturnValue([
      voice('Alex', 'en-US', 'alex'),
      voice('Google US English', 'en-US', 'google'),
      voice('Microsoft Aria Online (Natural)', 'en-US', 'aria'),
      voice('Hélène', 'fr-FR', 'fr'),
    ]);
    const automatic = create();
    automatic.speak('topic', 'Hello');
    await flushSpeech();
    const chosen = speak.mock.calls[0]![0] as UtteranceDouble;
    expect(chosen.voice?.voiceURI).toBe('aria');
    expect(chosen.lang).toBe('en-US');
    expect(chosen.rate).toBe(1);
    expect(chosen.pitch).toBe(1);
    expect(automatic.voices().some((item) => item.lang === 'fr-FR')).toBe(false);

    TestBed.resetTestingModule();
    speechVoiceUri = 'google';
    const saved = create();
    saved.speak('topic', 'Hello again');
    await flushSpeech();
    expect((speak.mock.calls[1]![0] as UtteranceDouble).voice?.voiceURI).toBe('google');
  });

  it('falls back when the saved voice is not installed here', async () => {
    getVoices.mockReturnValue([voice('Google US English', 'en-US', 'google')]);
    speechVoiceUri = 'removed-voice';
    const service = create();
    service.speak('topic', 'Hello');
    await flushSpeech();
    expect((speak.mock.calls[0]![0] as UtteranceDouble).voice?.voiceURI).toBe('google');
  });

  it('reloads the list when the browser finishes loading voices', () => {
    const service = create();
    expect(service.voices()).toEqual([]);
    getVoices.mockReturnValue([voice('Samantha')]);
    window.speechSynthesis.onvoiceschanged?.call(
      window.speechSynthesis,
      new Event('voiceschanged'),
    );
    expect(service.voices().map((item) => item.name)).toEqual(['Samantha']);
  });
});
