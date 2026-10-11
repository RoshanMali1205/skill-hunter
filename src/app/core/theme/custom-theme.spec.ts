import { describe, expect, it } from 'vitest';
import {
  MIN_TEXT_CONTRAST,
  buildCustomPalette,
  contrastRatio,
  customThemeVars,
  normalizeHex,
} from './custom-theme';

describe('custom theme palette', () => {
  it('normalizes hex codes and rejects non-colors', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('0E7490')).toBe('#0e7490');
    expect(normalizeHex(' #0e7490 ')).toBe('#0e7490');
    expect(normalizeHex('#12')).toBeNull();
    expect(normalizeHex('blue')).toBeNull();
    expect(normalizeHex('#gggggg')).toBeNull();
  });

  it('measures contrast like WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('keeps an already readable color unchanged in light mode', () => {
    const palette = buildCustomPalette('#4338ca');
    expect(palette.primary.light).toBe('#4338ca');
    expect(palette.adjusted.light).toBe(false);
  });

  it('darkens a too-bright color until text in it is readable on white', () => {
    const palette = buildCustomPalette('#facc15'); // bright yellow: ~1.5:1 on white
    expect(palette.adjusted.light).toBe(true);
    expect(contrastRatio(palette.primary.light, '#ffffff')).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  it('lightens a too-dark color for dark mode and keeps button text readable on it', () => {
    const palette = buildCustomPalette('#1e1b4b');
    expect(palette.adjusted.dark).toBe(true);
    expect(contrastRatio(palette.primary.dark, '#171d25')).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
    expect(contrastRatio('#0f1419', palette.primary.dark)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  it('is readable for a spread of colors in both modes', () => {
    for (const color of [
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#ffff00',
      '#ff00ff',
      '#00ffff',
      '#808080',
      '#ffffff',
      '#000000',
    ]) {
      const palette = buildCustomPalette(color);
      expect(contrastRatio(palette.primary.light, '#ffffff'), color).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      );
      expect(contrastRatio(palette.primary.dark, '#171d25'), color).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      );
    }
  });

  it('falls back to a safe default for invalid input', () => {
    expect(buildCustomPalette('not a color').primary.light).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('stays a one-hue theme until a second or third color is chosen', () => {
    const single = buildCustomPalette('#4338ca');
    expect(single.multi).toBe(false);
    expect(single.preview.tertiary).toBeUndefined();
    expect(single.light['--color-tertiary']).toBeUndefined();
  });

  it('blends three colors once a secondary or tertiary color is picked', () => {
    const palette = buildCustomPalette('#4338ca', '#f97316', '#0ea5e9');
    expect(palette.multi).toBe(true);
    const gradient = palette.light['--gradient-primary'];
    expect(gradient.match(/#[0-9a-f]{6}/g)).toHaveLength(3);
    expect(gradient).toContain(palette.primary.light);
    expect(palette.light['--color-secondary']).toBe(palette.preview.secondary);
    expect(palette.light['--color-tertiary']).toBe(palette.preview.tertiary);
  });

  it('keeps every gradient stop readable for white text, even for bright picks', () => {
    const palette = buildCustomPalette('#4338ca', '#f97316', '#facc15'); // orange and yellow
    for (const stop of [
      palette.primary.light,
      palette.preview.secondary!,
      palette.preview.tertiary!,
    ]) {
      expect(contrastRatio(stop, '#ffffff'), stop).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
    // In dark mode the banner is deep (white text) while buttons use bright stops (dark ink).
    const banner = palette.dark['--gradient-banner'].match(/#[0-9a-f]{6}/g)!;
    for (const stop of banner) {
      expect(contrastRatio(stop, '#ffffff'), stop).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
    const buttons = palette.dark['--gradient-primary'].match(/#[0-9a-f]{6}/g)!;
    for (const stop of buttons) {
      expect(contrastRatio('#0f1419', stop), stop).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it('derives neighbouring hues when only one extra color is given', () => {
    const palette = buildCustomPalette('#4338ca', null, '#0ea5e9');
    expect(palette.multi).toBe(true);
    expect(palette.preview.secondary).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('only sets surface-owning variables in the Classic style', () => {
    const palette = buildCustomPalette('#4338ca');
    expect(customThemeVars(palette, false, 'classic')['--gradient-page']).toBeDefined();
    expect(customThemeVars(palette, false, 'glass')['--gradient-page']).toBeUndefined();
    expect(customThemeVars(palette, false, 'glass')['--color-primary']).toBe('#4338ca');
    expect(customThemeVars(palette, false, 'neumorphic')['--shadow-primary']).toBeUndefined();
  });

  it('drops gradients for flat Neo-Brutalism so its solid colors apply', () => {
    const palette = buildCustomPalette('#4338ca');
    const vars = customThemeVars(palette, false, 'brutalism');
    expect(vars['--gradient-primary']).toBeUndefined();
    expect(vars['--gradient-banner']).toBeUndefined();
    expect(vars['--color-primary']).toBe('#4338ca');
  });
});
