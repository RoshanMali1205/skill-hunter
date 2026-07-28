import { Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { AppSettings, DEFAULT_SETTINGS } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);

  private readonly _settings = signal<AppSettings>(
    this.storage.get(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
  );

  readonly settings = this._settings.asReadonly();

  constructor() {
    effect(() => {
      const theme = this._settings().theme;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    });
  }

  toggleTheme(): void {
    this.update({ theme: this._settings().theme === 'dark' ? 'light' : 'dark' });
  }

  setDefaultDifficulty(defaultDifficulty: AppSettings['defaultDifficulty']): void {
    this.update({ defaultDifficulty });
  }

  setShowAnswersAutomatically(showAnswersAutomatically: boolean): void {
    this.update({ showAnswersAutomatically });
  }

  replaceAll(settings: AppSettings): void {
    this._settings.set(settings);
    this.persist();
  }

  resetAll(): void {
    this._settings.set(DEFAULT_SETTINGS);
    this.persist();
  }

  private update(partial: Partial<AppSettings>): void {
    this._settings.update((current) => ({ ...current, ...partial }));
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.settings, this._settings());
  }
}
