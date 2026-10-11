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
    document.documentElement.removeAttribute('data-ui-style');
    document.documentElement.removeAttribute('style');
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

  it('defaults to the classic interface style and applies a chosen style to the page', () => {
    expect(service.settings().uiStyle).toBe('classic');
    expect(document.documentElement.getAttribute('data-ui-style')).toBe('classic');

    service.setUiStyle('glass');
    TestBed.flushEffects();
    expect(service.settings().uiStyle).toBe('glass');
    expect(document.documentElement.getAttribute('data-ui-style')).toBe('glass');
    expect(set).toHaveBeenCalledWith(
      STORAGE_KEYS.settings,
      expect.objectContaining({ uiStyle: 'glass' }),
    );
  });

  it('applies every color theme, including the newer ones, to the page and browser chrome', () => {
    const expected: Record<string, string> = {
      indigo: '#818CF8', // stored settings are dark, so the dark variant is used
      violet: '#A78BFA',
      teal: '#2DD4BF',
      sunset: '#FB923C',
      northern: '#2DD4BF',
      candy: '#F472B6',
    };
    for (const [theme, color] of Object.entries(expected)) {
      service.setColorTheme(theme as never);
      TestBed.flushEffects();
      expect(document.documentElement.getAttribute('data-color-theme')).toBe(theme);
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
        color,
      );
    }
  });

  it('applies a custom theme to the page and removes it when switching back', () => {
    service.setCustomTheme('#4338ca', null);
    TestBed.flushEffects();
    const root = document.documentElement;
    expect(root.getAttribute('data-color-theme')).toBe('custom');
    expect(root.style.getPropertyValue('--color-primary')).not.toBe('');
    expect(root.style.getPropertyValue('--gradient-banner')).toContain('linear-gradient');
    expect(service.settings().customPrimary).toBe('#4338ca');

    service.setColorTheme('ocean');
    TestBed.flushEffects();
    expect(root.style.getPropertyValue('--color-primary')).toBe('');
    expect(root.style.getPropertyValue('--gradient-banner')).toBe('');
  });
});
