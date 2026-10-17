import { describe, expect, it } from 'vitest';
import { CURRENT_DATA_VERSION, STORAGE_KEYS, scopedKey } from './storage-keys';

describe('storage keys', () => {
  it('keeps a versioned set of unique storage keys', () => {
    expect(CURRENT_DATA_VERSION).toBe(1);
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((key) => key.startsWith('interview-prep.'))).toBe(true);
  });

  it('scopes account data and leaves signed-out keys unchanged', () => {
    expect(scopedKey(STORAGE_KEYS.progress, 'user-1')).toBe('interview-prep.progress::user-1');
    expect(scopedKey(STORAGE_KEYS.notes, null)).toBe(STORAGE_KEYS.notes);
  });
});
