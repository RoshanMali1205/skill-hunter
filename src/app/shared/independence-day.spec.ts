import { describe, expect, it } from 'vitest';
import { isIndependenceDayIconVisible, istCalendarParts } from './independence-day';

describe('independence-day', () => {
  it('reads IST calendar parts for a known UTC instant', () => {
    // 15 Aug 2026 22:30 IST == 15 Aug 2026 17:00 UTC
    const parts = istCalendarParts(new Date('2026-08-15T17:00:00.000Z'));
    expect(parts).toEqual({ month: 8, day: 15 });
  });

  it('is visible through 15 Aug EOD IST', () => {
    expect(isIndependenceDayIconVisible(new Date('2026-08-01T00:00:00+05:30'))).toBe(true);
    expect(isIndependenceDayIconVisible(new Date('2026-08-15T23:59:59+05:30'))).toBe(true);
  });

  it('hides after 15 Aug EOD IST', () => {
    expect(isIndependenceDayIconVisible(new Date('2026-08-16T00:00:00+05:30'))).toBe(false);
    expect(isIndependenceDayIconVisible(new Date('2026-07-31T23:59:59+05:30'))).toBe(false);
  });
});
