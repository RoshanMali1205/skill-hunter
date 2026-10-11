import { Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { AppSettings, ColorTheme, DEFAULT_SETTINGS, UiStyle } from '../models';
import { CssVars, buildCustomPalette, customThemeVars } from '../theme/custom-theme';

const THEME_COLORS: Record<ColorTheme, { light: string; dark: string }> = {
  ocean: { light: '#0B6E99', dark: '#3BA4D4' },
  indigo: { light: '#4338CA', dark: '#818CF8' },
  violet: { light: '#6D28D9', dark: '#A78BFA' },
  teal: { light: '#0F766E', dark: '#2DD4BF' },
  forest: { light: '#2E7D32', dark: '#66BB6A' },
  ember: { light: '#C62828', dark: '#EF5350' },
  sunset: { light: '#C2410C', dark: '#FB923C' },
  blush: { light: '#BE185D', dark: '#F472B6' },
  pearl: { light: '#795548', dark: '#BCAAA4' },
  midnight: { light: '#334155', dark: '#94A3B8' },
  northern: { light: '#0F766E', dark: '#2DD4BF' },
  glow: { light: '#C2410C', dark: '#FB923C' },
  reef: { light: '#1D4ED8', dark: '#60A5FA' },
  tropical: { light: '#047857', dark: '#34D399' },
  royal: { light: '#3730A3', dark: '#818CF8' },
  berry: { light: '#9D174D', dark: '#F472B6' },
  fjord: { light: '#1E40AF', dark: '#60A5FA' },
  candy: { light: '#BE185D', dark: '#F472B6' },
  // Replaced by the generated palette's own colors while the custom theme is active.
  custom: { light: '#0E7490', dark: '#22D3EE' },
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);

  private readonly _settings = signal<AppSettings>(this.loadSettings());

  readonly settings = this._settings.asReadonly();

  /** Custom-theme variables currently set on the page, so they can be removed when switching away. */
  private appliedCustomVars: string[] = [];

  constructor() {
    effect(() => {
      const { theme, colorTheme, uiStyle, customPrimary, customAccent, customTertiary } =
        this._settings();
      if (typeof document === 'undefined') return;

      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-color-theme', colorTheme);
      document.documentElement.setAttribute('data-ui-style', uiStyle);

      const root = document.documentElement;
      for (const name of this.appliedCustomVars) root.style.removeProperty(name);
      this.appliedCustomVars = [];

      let browserColor = THEME_COLORS[colorTheme][theme];
      if (colorTheme === 'custom') {
        const palette = buildCustomPalette(customPrimary, customAccent, customTertiary);
        const vars: CssVars = customThemeVars(palette, theme === 'dark', uiStyle);
        for (const [name, value] of Object.entries(vars)) {
          root.style.setProperty(name, value);
          this.appliedCustomVars.push(name);
        }
        browserColor = palette.primary[theme];
      }

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', browserColor);
      }
    });
  }

  toggleTheme(): void {
    this.update({ theme: this._settings().theme === 'dark' ? 'light' : 'dark' });
  }

  setColorTheme(colorTheme: ColorTheme): void {
    this.update({ colorTheme });
  }

  /** Switches to the custom theme with the given colors (#rrggbb). */
  setCustomTheme(
    customPrimary: string,
    customAccent: string | null,
    customTertiary: string | null = null,
  ): void {
    this.update({ colorTheme: 'custom', customPrimary, customAccent, customTertiary });
  }

  setUiStyle(uiStyle: UiStyle): void {
    this.update({ uiStyle });
  }

  setDefaultDifficulty(defaultDifficulty: AppSettings['defaultDifficulty']): void {
    this.update({ defaultDifficulty });
  }

  setShowAnswersAutomatically(showAnswersAutomatically: boolean): void {
    this.update({ showAnswersAutomatically });
  }

  setDailyGoalMinutes(dailyGoalMinutes: number): void {
    this.update({ dailyGoalMinutes });
  }

  replaceAll(settings: AppSettings): void {
    this._settings.set({ ...DEFAULT_SETTINGS, ...settings });
    this.persist();
  }

  resetAll(): void {
    this._settings.set(DEFAULT_SETTINGS);
    this.persist();
  }

  private loadSettings(): AppSettings {
    const stored = this.storage.get(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  private update(partial: Partial<AppSettings>): void {
    this._settings.update((current) => ({ ...current, ...partial }));
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.settings, this._settings());
  }
}
