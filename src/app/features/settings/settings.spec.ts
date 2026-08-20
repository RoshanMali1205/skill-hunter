import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../core/models';
import { DataManagementService } from '../../core/services/data-management.service';
import { ProfileService } from '../../core/services/profile.service';
import { PwaService } from '../../core/services/pwa.service';
import { SettingsService } from '../../core/services/settings.service';
import { SettingsComponent } from './settings';

describe('SettingsComponent', () => {
  const settings = signal(DEFAULT_SETTINGS);
  const displayName = signal('Ada Lovelace');
  const setDisplayName = vi.fn((name: string) => !!name.trim());
  const setPhotoFromFile = vi.fn();
  const promptInstall = vi.fn();
  const resetAllProgress = vi.fn();
  const importFromJson = vi.fn();
  const downloadExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([]),
        {
          provide: SettingsService,
          useValue: {
            settings,
            toggleTheme: vi.fn(),
            setColorTheme: vi.fn(),
            setDefaultDifficulty: vi.fn(),
            setShowAnswersAutomatically: vi.fn(),
          },
        },
        {
          provide: DataManagementService,
          useValue: { resetAllProgress, importFromJson, downloadExport },
        },
        {
          provide: ProfileService,
          useValue: {
            displayName,
            photoDataUrl: signal(null),
            setDisplayName,
            setPhotoFromFile,
            clearPhoto: vi.fn(),
          },
        },
        {
          provide: PwaService,
          useValue: { promptInstall, canInstall: signal(false), isInstalled: signal(false) },
        },
      ],
    });
  });

  function create() {
    return TestBed.createComponent(SettingsComponent).componentInstance;
  }

  it('derives initials and reports display-name validation', () => {
    const component = create();
    expect(component.initials()).toBe('AL');
    component.nameDraft.set('');
    component.saveDisplayName();
    expect(component.profileMessage()).toEqual({
      text: 'Enter a name to continue.',
      success: false,
    });
    component.nameDraft.set('Grace');
    component.saveDisplayName();
    expect(component.profileMessage()?.success).toBe(true);
  });

  it('maps install outcomes to user-facing messages', async () => {
    const component = create();
    promptInstall
      .mockResolvedValueOnce('accepted')
      .mockResolvedValueOnce('dismissed')
      .mockResolvedValueOnce('unavailable');
    await component.installApp();
    expect(component.installMessage()).toContain('added');
    await component.installApp();
    expect(component.installMessage()).toBe('Install canceled.');
    await component.installApp();
    expect(component.installMessage()).toContain('browser menu');
  });

  it('imports valid data and handles malformed JSON', async () => {
    const component = create();
    importFromJson.mockReturnValue({ success: true });
    const validInput = {
      files: [{ text: () => Promise.resolve('{"version":1}') }],
      value: 'file',
    } as unknown as HTMLInputElement;
    await component.onImportFile({ target: validInput } as unknown as Event);
    expect(importFromJson).toHaveBeenCalledWith({ version: 1 });
    expect(component.importMessage()?.success).toBe(true);

    const invalidInput = {
      files: [{ text: () => Promise.resolve('{bad') }],
      value: 'file',
    } as unknown as HTMLInputElement;
    await component.onImportFile({ target: invalidInput } as unknown as Event);
    expect(component.importMessage()).toEqual({
      text: 'This file is not valid JSON.',
      success: false,
    });
  });

  it('requires RESET before clearing progress and delegates export', () => {
    const component = create();
    component.requestReset();
    component.confirmReset();
    expect(resetAllProgress).not.toHaveBeenCalled();
    component.resetConfirmText.set(' reset ');
    component.confirmReset();
    expect(resetAllProgress).toHaveBeenCalledOnce();
    component.exportProgress();
    expect(downloadExport).toHaveBeenCalledOnce();
  });
});
