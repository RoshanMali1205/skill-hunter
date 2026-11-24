/** Browser voices, best first. Edge/macOS neural, then Chrome Google, then enhanced. */
const VOICE_PREFERENCES: readonly RegExp[] = [
  /Natural|Neural/i,
  /Google (US|UK) English/i,
  /Premium|Enhanced/i,
  /Samantha|Daniel|Karen|Moira|Veena|Rishi/i,
];

/** Novelty and legacy synthesizers that sound worse than the plain system voice. */
const ROBOTIC_VOICES = /espeak|android|compact|zarvox|whisper|bells|boing|trinoids|bad news|bahh/i;

export const SPEECH_RATES = [0.85, 1, 1.15, 1.3] as const;
export type SpeechRate = (typeof SPEECH_RATES)[number];

/** Chrome drops a single utterance after about 15 seconds, so chunks stay short. */
const MAX_CHUNK_LENGTH = 240;

const MAX_VOICE_URI_LENGTH = 200;

export interface SpeechVoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
  /** Remote neural voices (localService false) usually sound better than the on-device copy. */
  localService?: boolean;
}

export function voiceChoiceId(voice: SpeechVoiceInfo): string {
  const uri = voice.voiceURI.trim();
  return uri || voice.name;
}

export function voiceLabel(voice: SpeechVoiceInfo): string {
  return voice.lang ? `${voice.name} (${voice.lang})` : voice.name;
}

/** Lower is a better match for the built-in preference list. */
export function voiceRank(voice: SpeechVoiceInfo): number {
  if (ROBOTIC_VOICES.test(voice.name)) return VOICE_PREFERENCES.length + 1;
  const index = VOICE_PREFERENCES.findIndex((pattern) => pattern.test(voice.name));
  return index === -1 ? VOICE_PREFERENCES.length : index;
}

export function compareVoices(a: SpeechVoiceInfo, b: SpeechVoiceInfo): number {
  return (
    voiceRank(a) - voiceRank(b) ||
    Number(Boolean(a.localService)) - Number(Boolean(b.localService)) ||
    a.name.localeCompare(b.name)
  );
}

/** English voices when the browser has any; otherwise every voice, so speech still works. */
export function voicesForSpeech<T extends SpeechVoiceInfo>(voices: readonly T[]): T[] {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const pool = english.length > 0 ? english : [...voices];
  return [...pool].sort(compareVoices);
}

/**
 * Saved choice when this browser still has it, otherwise the best available voice.
 * A voice URI from another browser (or a removed voice pack) falls back cleanly.
 */
export function pickSpeechVoice<T extends SpeechVoiceInfo>(
  voices: readonly T[],
  preferredId: string | null,
  preferredLang?: string,
): T | undefined {
  if (preferredId) {
    const chosen = voices.find(
      (voice) =>
        voiceChoiceId(voice) === preferredId ||
        voice.voiceURI === preferredId ||
        voice.name === preferredId,
    );
    if (chosen) return chosen;
  }
  const pool = voicesForSpeech(voices);
  if (pool.length === 0) return undefined;
  const bestRank = voiceRank(pool[0]!);
  const top = pool.filter((voice) => voiceRank(voice) === bestRank);
  top.sort((a, b) => languageScore(b.lang, preferredLang) - languageScore(a.lang, preferredLang));
  return top[0];
}

/** 2 = same region (en-IN), 1 = same language (en), 0 = different language. */
function languageScore(voiceLang: string, preferredLang: string | undefined): number {
  if (!preferredLang) return 0;
  const voice = voiceLang.toLowerCase().replace('_', '-');
  const preferred = preferredLang.toLowerCase().replace('_', '-');
  if (voice === preferred) return 2;
  return voice.slice(0, 2) === preferred.slice(0, 2) ? 1 : 0;
}

/** Snap to a supported speed. Anything else means Normal. */
export function normalizeSpeechRate(value: unknown): SpeechRate {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  let closest: SpeechRate = 1;
  let distance = Infinity;
  for (const rate of SPEECH_RATES) {
    const gap = Math.abs(rate - value);
    if (gap < distance) {
      distance = gap;
      closest = rate;
    }
  }
  return distance <= 0.05 ? closest : 1;
}

/** Empty, oversized, or non-text values mean "Automatic". */
export function normalizeSpeechVoiceUri(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_VOICE_URI_LENGTH) return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  return trimmed;
}

/** Split narration into sentence-sized pieces the browser can finish speaking. */
export function chunkSpeechText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  for (const sentence of splitSentences(cleaned)) {
    if (sentence.length <= MAX_CHUNK_LENGTH) {
      chunks.push(sentence);
    } else {
      chunks.push(...splitLongSentence(sentence));
    }
  }
  return chunks;
}

/**
 * Break on . ! ? that end a sentence. Periods inside numbers (1.5) stay put,
 * and a period with no space after it (e.g. `e.g.`) is not a break.
 */
function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char !== '.' && char !== '!' && char !== '?') continue;
    if (
      char === '.' &&
      index > 0 &&
      index + 1 < text.length &&
      isDigit(text[index - 1]!) &&
      isDigit(text[index + 1]!)
    ) {
      continue;
    }

    let end = index + 1;
    while (end < text.length && (text[end] === '.' || text[end] === '!' || text[end] === '?')) {
      end++;
    }
    if (end < text.length && !/\s/.test(text[end]!)) continue;

    const sentence = text.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
  }

  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function splitLongSentence(sentence: string): string[] {
  const pieces = sentence.split(/(?<=[,;:])\s+/);
  const chunks: string[] = [];
  let current = '';

  const flush = (): void => {
    const trimmed = current.trim();
    current = '';
    if (!trimmed) return;
    chunks.push(...hardWrap(trimmed));
  };

  for (const piece of pieces) {
    const next = current ? `${current} ${piece}` : piece;
    if (next.length > MAX_CHUNK_LENGTH && current) {
      flush();
      current = piece;
    } else {
      current = next;
    }
  }
  flush();
  return chunks;
}

function hardWrap(text: string): string[] {
  if (text.length <= MAX_CHUNK_LENGTH) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK_LENGTH) {
    const window = rest.slice(0, MAX_CHUNK_LENGTH + 1);
    const breakAt = window.lastIndexOf(' ');
    const cut = breakAt > 40 ? breakAt : MAX_CHUNK_LENGTH;
    const piece = rest.slice(0, cut).trim();
    if (piece) chunks.push(piece);
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
