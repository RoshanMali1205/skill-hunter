import { describe, expect, it } from 'vitest';
import {
  chunkSpeechText,
  normalizeSpeechRate,
  normalizeSpeechVoiceUri,
  pickSpeechVoice,
  voicesForSpeech,
  type SpeechVoiceInfo,
} from './speech-text';

function voice(name: string, lang = 'en-US', voiceURI = name): SpeechVoiceInfo {
  return { name, lang, voiceURI };
}

describe('pickSpeechVoice', () => {
  const voices = [
    voice('Alex'),
    voice('Samantha'),
    voice('Google UK English Female'),
    voice('Microsoft Aria Online (Natural)'),
  ];

  it('prefers Natural, then Google, then named macOS voices', () => {
    expect(pickSpeechVoice(voices, null)?.name).toBe('Microsoft Aria Online (Natural)');
    expect(voicesForSpeech(voices).map((item) => item.name)).toEqual([
      'Microsoft Aria Online (Natural)',
      'Google UK English Female',
      'Samantha',
      'Alex',
    ]);
  });

  it('uses a saved voice when this browser still has it', () => {
    expect(pickSpeechVoice(voices, 'Samantha')?.name).toBe('Samantha');
  });

  it('falls back when the saved voice is missing', () => {
    expect(pickSpeechVoice(voices, 'com.apple.voice.removed')?.name).toBe(
      'Microsoft Aria Online (Natural)',
    );
  });

  it('prefers the listener’s region when several natural voices exist', () => {
    const voices = [
      voice('Microsoft Aria Online (Natural)', 'en-US', 'aria'),
      voice('Microsoft Neerja Online (Natural)', 'en-IN', 'neerja'),
    ];
    expect(pickSpeechVoice(voices, null, 'en-IN')?.voiceURI).toBe('neerja');
    expect(pickSpeechVoice(voices, null, 'en-US')?.voiceURI).toBe('aria');
  });

  it('puts remote natural voices ahead of a local copy and a robotic voice last', () => {
    const voices = [
      { ...voice('eSpeak English', 'en-US', 'espeak'), localService: true },
      { ...voice('Microsoft Aria Online (Natural)', 'en-US', 'local'), localService: true },
      { ...voice('Microsoft Aria Online (Natural)', 'en-US', 'remote'), localService: false },
    ];
    expect(voicesForSpeech(voices).map((item) => item.voiceURI)).toEqual([
      'remote',
      'local',
      'espeak',
    ]);
  });

  it('keeps non-English voices only when no English voice exists', () => {
    const french = [voice('Hélène', 'fr-FR')];
    expect(voicesForSpeech([...french, voice('Samantha')]).map((item) => item.name)).toEqual([
      'Samantha',
    ]);
    expect(voicesForSpeech(french).map((item) => item.name)).toEqual(['Hélène']);
  });
});

describe('normalizeSpeechVoiceUri', () => {
  it('keeps a trimmed voice id and rejects empty or unsafe values', () => {
    expect(normalizeSpeechVoiceUri('  Google US English  ')).toBe('Google US English');
    expect(normalizeSpeechVoiceUri('')).toBeNull();
    expect(normalizeSpeechVoiceUri('   ')).toBeNull();
    expect(normalizeSpeechVoiceUri('x'.repeat(201))).toBeNull();
    expect(normalizeSpeechVoiceUri('bad\nid')).toBeNull();
    expect(normalizeSpeechVoiceUri(12)).toBeNull();
  });
});

describe('normalizeSpeechRate', () => {
  it('snaps to a supported speed and rejects anything else', () => {
    expect(normalizeSpeechRate(1.15)).toBe(1.15);
    expect(normalizeSpeechRate(1.14)).toBe(1.15);
    expect(normalizeSpeechRate(0.85)).toBe(0.85);
    expect(normalizeSpeechRate(4)).toBe(1);
    expect(normalizeSpeechRate('fast')).toBe(1);
  });
});

describe('chunkSpeechText', () => {
  it('splits on sentence punctuation and keeps decimals intact', () => {
    expect(chunkSpeechText('Version 1.5 shipped. It is stable!')).toEqual([
      'Version 1.5 shipped.',
      'It is stable!',
    ]);
  });

  it('breaks a very long sentence into shorter pieces', () => {
    const sentence = Array.from({ length: 40 }, (_, index) => `word${index}`).join(', ');
    const chunks = chunkSpeechText(sentence);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 240)).toBe(true);
    expect(chunks.join(' ')).toContain('word0');
    expect(chunks.join(' ')).toContain('word39');
  });

  it('returns nothing for blank text', () => {
    expect(chunkSpeechText('   ')).toEqual([]);
  });
});
