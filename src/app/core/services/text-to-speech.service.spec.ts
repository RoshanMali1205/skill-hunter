import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextToSpeechService } from './text-to-speech.service';

class UtteranceDouble {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly text: string) {}
}

describe('TextToSpeechService', () => {
  const cancel = vi.fn();
  const speak = vi.fn();
  let speechDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    speechDescriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel, speak },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', UtteranceDouble);
    cancel.mockReset();
    speak.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (speechDescriptor) Object.defineProperty(window, 'speechSynthesis', speechDescriptor);
    else delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it('speaks non-empty text and tracks the active item', () => {
    const service = new TextToSpeechService();
    service.speak('topic-1', 'Hello');
    expect(cancel).toHaveBeenCalledOnce();
    expect(service.speakingId()).toBe('topic-1');
    expect((speak.mock.calls[0]![0] as UtteranceDouble).text).toBe('Hello');
  });

  it('clears state when speech ends or errors', () => {
    const service = new TextToSpeechService();
    service.speak('one', 'First');
    const first = speak.mock.calls[0]![0] as UtteranceDouble;
    first.onend?.();
    expect(service.speakingId()).toBeNull();

    service.speak('two', 'Second');
    (speak.mock.calls[1]![0] as UtteranceDouble).onerror?.();
    expect(service.speakingId()).toBeNull();
  });

  it('toggles the same item off and ignores blank text', () => {
    const service = new TextToSpeechService();
    service.speak('one', '   ');
    expect(speak).not.toHaveBeenCalled();
    service.toggle('one', 'Read me');
    service.toggle('one', 'Read me');
    expect(service.speakingId()).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
