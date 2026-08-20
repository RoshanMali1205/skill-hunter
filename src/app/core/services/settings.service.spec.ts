import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../models';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let set: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    set = vi.fn();
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: StorageService, useValue: { get: () => ({ theme: 'dark' }), set } },
      ],
    });
    service = TestBed.inject(SettingsService);
    TestBed.flushEffects();
  });

  afterEach(() => {
    document.querySelector('meta[name="theme-color"]')?.remove();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-color-theme');
  });

  it('merges stored partial settings with defaults and applies the theme', () => {
    expect(service.settings()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#3BA4D4',
    );
  });

  it('updates every preference and persists changes', () => {
    service.toggleTheme();
    service.setColorTheme('forest');
    service.setDefaultDifficulty('advanced');
    service.setShowAnswersAutomatically(true);
    service.setDailyGoalMinutes(45);
    expect(service.settings()).toMatchObject({
      theme: 'light',
      colorTheme: 'forest',
      defaultDifficulty: 'advanced',
      showAnswersAutomatically: true,
      dailyGoalMinutes: 45,
    });
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.settings, service.settings());
  });

  it('normalizes replacements and resets to defaults', () => {
    service.replaceAll({ ...DEFAULT_SETTINGS, theme: 'dark', colorTheme: 'ember' });
    expect(service.settings().colorTheme).toBe('ember');
    service.resetAll();
    expect(service.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
