import { Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { AppSettings, ColorTheme, DEFAULT_SETTINGS } from '../models';

const THEME_COLORS: Record<ColorTheme, { light: string; dark: string }> = {
  ocean: { light: '#007bb8', dark: '#0095d9' },
  forest: { light: '#66BB6A', dark: '#66BB6A' },
  ember: { light: '#E53935', dark: '#EF5350' },
  sunset: { light: '#F97316', dark: '#FB923C' },
  blush: { light: '#EC4899', dark: '#F472B6' },
  pearl: { light: '#B07D57', dark: '#C9895A' },
  midnight: { light: '#334155', dark: '#94A3B8' },
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);

  private readonly _settings = signal<AppSettings>(this.loadSettings());

  readonly settings = this._settings.asReadonly();

  constructor() {
    effect(() => {
      const { theme, colorTheme } = this._settings();
      if (typeof document === 'undefined') return;

      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-color-theme', colorTheme);

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', THEME_COLORS[colorTheme][theme]);
      }
    });
  }

  toggleTheme(): void {
    this.update({ theme: this._settings().theme === 'dark' ? 'light' : 'dark' });
  }

  setColorTheme(colorTheme: ColorTheme): void {
    this.update({ colorTheme });
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
