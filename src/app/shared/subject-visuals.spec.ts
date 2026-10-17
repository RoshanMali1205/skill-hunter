import { describe, expect, it } from 'vitest';
import { subjectVisual } from './subject-visuals';

describe('subjectVisual', () => {
  it('returns the palette for each shipped subject', () => {
    expect(subjectVisual('angular')).toEqual({ emoji: '🅰️', color: '#dd0031' });
    expect(subjectVisual('javascript').emoji).toBe('🟨');
    expect(subjectVisual('typescript').color).toBe('#3178c6');
    expect(subjectVisual('ui').emoji).toBe('🎨');
    expect(subjectVisual('system-design').emoji).toBe('🏗️');
    expect(subjectVisual('design-patterns').emoji).toBe('🧩');
    expect(subjectVisual('ai-concepts').emoji).toBe('🤖');
  });

  it('falls back for an unknown subject', () => {
    expect(subjectVisual('unknown')).toEqual({ emoji: '📘', color: '#6b7280' });
  });
});
