/**
 * Builds a complete, readable theme from one or two colors the learner picks.
 *
 * The built-in themes live in SCSS. A custom theme can't, so the same CSS variables are
 * produced here and set on the page. The important guarantee is readability: the main
 * color is nudged (never rejected) until text in that color has at least 4.5:1 contrast
 * on the page background, in both light and dark mode.
 */

export type CssVars = Record<string, string>;

export interface CustomPalette {
  /** Variables for light mode. */
  light: CssVars;
  /** Variables for dark mode. */
  dark: CssVars;
  /** Variables that the Glass/Neumorphic/Spatial styles own, so they are applied in Classic only. */
  lightClassicOnly: CssVars;
  darkClassicOnly: CssVars;
  /** The main color after readability adjustment, per mode. */
  primary: { light: string; dark: string };
  /** True when the picked color had to be changed to stay readable. */
  adjusted: { light: boolean; dark: boolean };
  /** Contrast of the final main color against the page background (white / dark surface). */
  contrast: { light: number; dark: number };
  /** Preview colors for the picker card. `secondary` and `tertiary` are set in multi-color mode. */
  preview: {
    primary: string;
    accent: string;
    deep: string;
    tint: string;
    secondary?: string;
    tertiary?: string;
  };
  /** True when the learner chose a secondary or tertiary color, so gradients blend three colors. */
  multi: boolean;
}

export const MIN_TEXT_CONTRAST = 4.5;
const LIGHT_SURFACE = '#ffffff';
const DARK_SURFACE = '#171d25';
const DARK_INK = '#0f1419';

export const DEFAULT_CUSTOM_PRIMARY = '#0e7490';

// ── Color math ───────────────────────────────────────────────────────────

/** Accepts "#abc", "abc", "#aabbcc" and returns "#aabbcc", or null if it is not a color. */
export function normalizeHex(value: string): string | null {
  const text = value.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(text)) {
    return (
      '#' +
      text
        .split('')
        .map((c) => c + c)
        .join('')
    );
  }
  return /^[0-9a-f]{6}$/.test(text) ? '#' + text : null;
}

function toRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function fromRgb([r, g, b]: number[]): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function toHsl(hex: string): Hsl {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

function fromHsl({ h, s, l }: Hsl): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return fromRgb([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Same result as CSS `color-mix(in srgb, a (1-t), b t)`. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return fromRgb([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/**
 * Moves a color's lightness (keeping its hue and saturation) until it reaches the contrast
 * target against `background`, in the direction that makes it stand out more.
 */
function ensureContrast(
  hex: string,
  background: string,
  target: number,
  direction: 'darken' | 'lighten',
): { color: string; changed: boolean } {
  let hsl = toHsl(hex);
  let color = hex;
  let changed = false;
  for (let i = 0; i < 100 && contrastRatio(color, background) < target; i++) {
    hsl = { ...hsl, l: hsl.l + (direction === 'darken' ? -1 : 1) };
    if (hsl.l < 0 || hsl.l > 100) break;
    color = fromHsl(hsl);
    changed = true;
  }
  return { color, changed };
}

function rgbList(hex: string): string {
  return toRgb(hex).join(', ');
}

// ── Palette ──────────────────────────────────────────────────────────────

export function buildCustomPalette(
  primaryInput: string,
  accentInput?: string | null,
  tertiaryInput?: string | null,
): CustomPalette {
  const picked = normalizeHex(primaryInput) ?? DEFAULT_CUSTOM_PRIMARY;
  const hsl = toHsl(picked);
  // Near-greys have no real hue; keep them calm instead of letting saturation noise through.
  const sat = Math.min(hsl.s, 92);
  const userAccent = accentInput ? normalizeHex(accentInput) : null;
  const userTertiary = tertiaryInput ? normalizeHex(tertiaryInput) : null;
  // Choosing a second or third color switches from a one-hue theme to a blended palette.
  const multi = !!(userAccent || userTertiary);

  // ── Light mode ──
  const lightPrimary = ensureContrast(picked, LIGHT_SURFACE, MIN_TEXT_CONTRAST, 'darken');
  const p = lightPrimary.color;
  const pl = toHsl(p);
  const strong = fromHsl({ h: pl.h, s: sat, l: Math.max(8, pl.l - 12) });
  const deep = fromHsl({ h: pl.h, s: Math.min(sat, 85), l: 15 });
  const accent = userAccent ?? fromHsl({ h: pl.h, s: sat, l: Math.min(62, pl.l + 14) });
  const tint = fromHsl({ h: pl.h, s: Math.min(sat, 70), l: 96 });
  const mid = fromHsl({ h: pl.h, s: Math.min(sat, 70), l: 76 });
  // Keep the gradient's first stop readable for white text, even with a bright accent.
  const startLight = mix(p, accent, 0.14);
  const gradStart = contrastRatio(startLight, LIGHT_SURFACE) >= MIN_TEXT_CONTRAST ? startLight : p;
  const bannerStart = mix(p, accent, 0.1);
  const bannerFrom =
    contrastRatio(bannerStart, LIGHT_SURFACE) >= MIN_TEXT_CONTRAST ? bannerStart : p;

  // Secondary and tertiary: what the learner picked, or neighbouring hues if only one was given.
  const secondaryRaw = userAccent ?? fromHsl({ h: (pl.h + 40) % 360, s: sat, l: pl.l });
  const tertiaryRaw = userTertiary ?? fromHsl({ h: (pl.h + 80) % 360, s: sat, l: pl.l });
  // Gradient stops carry white text, so each one is darkened until it reaches 4.5:1.
  const s2 = ensureContrast(secondaryRaw, LIGHT_SURFACE, MIN_TEXT_CONTRAST, 'darken').color;
  const s3 = ensureContrast(tertiaryRaw, LIGHT_SURFACE, MIN_TEXT_CONTRAST, 'darken').color;

  const light: CssVars = {
    '--color-primary': p,
    '--color-primary-strong': strong,
    '--color-primary-contrast': '#ffffff',
    '--color-accent': accent,
    '--gradient-primary': `linear-gradient(135deg, ${gradStart} 0%, ${p} 50%, ${deep} 100%)`,
    '--gradient-banner': `linear-gradient(135deg, ${bannerFrom} 0%, ${p} 45%, ${deep} 100%)`,
    '--gradient-tile-strong': `linear-gradient(145deg, ${deep} 0%, ${p} 52%, ${accent} 100%)`,
    '--gradient-brand-text': `linear-gradient(90deg, ${deep} 0%, ${p} 55%, ${accent} 100%)`,
    '--shadow-primary': `0 8px 22px rgba(${rgbList(p)}, 0.26)`,
  };
  if (multi) {
    light['--color-accent'] = s2;
    light['--color-secondary'] = s2;
    light['--color-tertiary'] = s3;
    light['--gradient-primary'] = `linear-gradient(135deg, ${p} 0%, ${s2} 55%, ${s3} 100%)`;
    light['--gradient-banner'] = `linear-gradient(135deg, ${p} 0%, ${s2} 55%, ${s3} 100%)`;
    light['--gradient-tile-strong'] = `linear-gradient(145deg, ${p} 0%, ${s2} 55%, ${s3} 100%)`;
    light['--gradient-brand-text'] = `linear-gradient(90deg, ${p} 0%, ${s2} 55%, ${s3} 100%)`;
  }
  const lightClassicOnly: CssVars = {
    '--color-surface-alt': mix('#eef1f4', tint, 0.62),
    '--gradient-hero': `linear-gradient(135deg, ${mix('#f6f7f9', p, 0.12)} 0%, ${mix('#ffffff', tint, 0.55)} 48%, ${mix('#f6f7f9', mid, 0.14)} 100%)`,
    '--gradient-tile': `linear-gradient(165deg, #ffffff 0%, ${mix('#ffffff', tint, 0.35)} 62%, #f1f3f5 100%)`,
    '--gradient-page': `linear-gradient(180deg, ${mix('#f6f7f9', tint, 0.45)} 0%, #f6f7f9 26%, #f6f7f9 100%)`,
    '--header-wash': `linear-gradient(180deg, ${mix('#f6f7f9', tint, 0.42)} 0%, transparent 100%)`,
  };
  if (multi) {
    lightClassicOnly['--gradient-page'] =
      `linear-gradient(180deg, ${mix('#f6f7f9', p, 0.11)} 0%, ${mix('#f6f7f9', s2, 0.07)} 20%, #f6f7f9 42%)`;
    lightClassicOnly['--header-wash'] =
      `linear-gradient(90deg, ${mix('#f6f7f9', p, 0.13)} 0%, ${mix('#f6f7f9', s2, 0.11)} 50%, ${mix('#f6f7f9', s3, 0.13)} 100%)`;
  }

  // ── Dark mode ──
  const darkPrimary = ensureContrast(picked, DARK_SURFACE, MIN_TEXT_CONTRAST, 'lighten');
  // Text on a filled button in dark mode is near-black, so the fill must be light enough for it too.
  const darkFill = ensureContrast(darkPrimary.color, DARK_INK, MIN_TEXT_CONTRAST, 'lighten');
  const dp = darkFill.color;
  const dpl = toHsl(dp);
  const dStrong = fromHsl({ h: dpl.h, s: Math.min(sat, 85), l: 88 });
  const dMid = fromHsl({ h: dpl.h, s: Math.min(sat, 85), l: 78 });
  const dAccent = userAccent ? ensureContrast(userAccent, DARK_SURFACE, 3, 'lighten').color : dMid;
  // White text sits on the banner in dark mode, so its base must be dark enough.
  const dDeep = ensureContrast(
    fromHsl({ h: dpl.h, s: Math.min(sat, 80), l: 32 }),
    '#ffffff',
    7,
    'darken',
  ).color;
  const dBannerStart = mix(dDeep, dp, 0.15);

  const dark: CssVars = {
    '--color-primary': dp,
    '--color-primary-strong': dStrong,
    '--color-primary-contrast': DARK_INK,
    '--color-accent': dAccent,
    '--gradient-primary': `linear-gradient(135deg, ${dMid} 0%, ${dp} 45%, ${dDeep} 100%)`,
    '--gradient-banner': `linear-gradient(135deg, ${dBannerStart} 0%, ${dDeep} 100%)`,
    '--gradient-tile-strong': `linear-gradient(145deg, ${dp} 0%, ${dDeep} 55%, ${DARK_INK} 100%)`,
    '--gradient-brand-text': `linear-gradient(90deg, #ffffff 0%, #e8edf2 42%, ${dMid} 100%)`,
    '--shadow-primary': `0 8px 24px rgba(${rgbList(dp)}, 0.28)`,
  };
  if (multi) {
    // Bright stops for filled buttons (dark ink on top), deep stops for banners (white text on top).
    const brighten = (hex: string) =>
      ensureContrast(
        ensureContrast(hex, DARK_SURFACE, MIN_TEXT_CONTRAST, 'lighten').color,
        DARK_INK,
        MIN_TEXT_CONTRAST,
        'lighten',
      ).color;
    const deepen = (hex: string) =>
      ensureContrast(
        fromHsl({ h: toHsl(hex).h, s: Math.min(sat, 80), l: 32 }),
        '#ffffff',
        7,
        'darken',
      ).color;
    const b2 = brighten(secondaryRaw);
    const b3 = brighten(tertiaryRaw);
    const d2 = deepen(secondaryRaw);
    const d3 = deepen(tertiaryRaw);
    dark['--color-accent'] = b2;
    dark['--color-secondary'] = b2;
    dark['--color-tertiary'] = b3;
    dark['--gradient-primary'] = `linear-gradient(135deg, ${dp} 0%, ${b2} 55%, ${b3} 100%)`;
    dark['--gradient-banner'] = `linear-gradient(135deg, ${dDeep} 0%, ${d2} 55%, ${d3} 100%)`;
    dark['--gradient-tile-strong'] = `linear-gradient(145deg, ${dDeep} 0%, ${d2} 55%, ${d3} 100%)`;
    dark['--gradient-brand-text'] = `linear-gradient(90deg, ${dp} 0%, ${b2} 55%, ${b3} 100%)`;
  }
  const darkClassicOnly: CssVars = {
    '--color-surface-alt': mix('#222a35', dp, 0.12),
    '--gradient-hero': `linear-gradient(135deg, ${mix('#171d25', dp, 0.2)} 0%, #171d25 55%, ${DARK_INK} 100%)`,
    '--header-wash': `linear-gradient(180deg, ${mix('#171d25', dp, 0.12)} 0%, transparent 100%)`,
  };

  return {
    light,
    dark,
    lightClassicOnly,
    darkClassicOnly,
    primary: { light: p, dark: dp },
    adjusted: {
      light: lightPrimary.changed,
      dark: darkPrimary.changed || darkFill.changed,
    },
    contrast: {
      light: contrastRatio(p, LIGHT_SURFACE),
      dark: contrastRatio(dp, DARK_SURFACE),
    },
    preview: multi
      ? { primary: p, accent: s2, deep, tint, secondary: s2, tertiary: s3 }
      : { primary: p, accent, deep, tint },
    multi,
  };
}

/** The variables to set on the page for the current mode and interface style. */
export function customThemeVars(palette: CustomPalette, isDark: boolean, uiStyle: string): CssVars {
  const base = isDark ? palette.dark : palette.light;
  const vars: CssVars = { ...base };
  // Glass, Neumorphic and Spatial define their own surfaces and shadows; only add ours in Classic.
  if (uiStyle === 'classic') {
    Object.assign(vars, isDark ? palette.darkClassicOnly : palette.lightClassicOnly);
  }
  if (uiStyle === 'neumorphic' || uiStyle === 'clay') delete vars['--shadow-primary'];
  // Brutalism is flat: drop the gradients and soft glow so the style's solid colors and hard shadows apply.
  if (uiStyle === 'brutalism') {
    for (const name of [
      '--gradient-primary',
      '--gradient-banner',
      '--gradient-tile-strong',
      '--gradient-brand-text',
      '--shadow-primary',
    ]) {
      delete vars[name];
    }
  }
  return vars;
}
