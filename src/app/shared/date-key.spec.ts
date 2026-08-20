import { describe, expect, it } from 'vitest';
import { addDays, dateKey } from './date-key';

describe('date helpers', () => {
  it('formats local calendar dates with zero padding', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('moves across month and year boundaries without mutating the input', () => {
    const original = new Date(2025, 11, 31, 12);
    const next = addDays(original, 1);
    expect(dateKey(next)).toBe('2026-01-01');
    expect(dateKey(original)).toBe('2025-12-31');
  });
});
