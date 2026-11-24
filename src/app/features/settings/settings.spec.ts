import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../core/models';
import { DataManagementService } from '../../core/services/data-management.service';
import { ProfileService } from '../../core/services/profile.service';
import { PwaService } from '../../core/services/pwa.service';
import { SettingsService } from '../../core/services/settings.service';
import { SPEECH_PREVIEW_ID, TextToSpeechService } from '../../core/services/text-to-speech.service';
import { SettingsComponent } from './settings';

describe('SettingsComponent', () => {
  const settings = signal(DEFAULT_SETTINGS);
  const displayName = signal('Ada Lovelace');
  const setDisplayName = vi.fn((name: string) => !!name.trim());
  const setPhotoFromFile = vi.fn();
  const promptInstall = vi.fn();
  const resetAllProgress = vi.fn();
  const previewImport = vi.fn();
  const applyImport = vi.fn();
  const downloadExport = vi.fn();
  const setSpeechVoice = vi.fn();
  const ttsToggle = vi.fn();
  const ttsStop = vi.fn();
  const speakingId = signal<string | null>(null);
  const paused = signal(false);
  const voices = signal<SpeechSynthesisVoice[]>([]);
  const setSpeechRate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    voices.set([]);
    speakingId.set(null);
    paused.set(false);
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
            setSpeechVoice,
            setSpeechRate,
          },
        },
        {
          provide: TextToSpeechService,
          useValue: {
            supported: true,
            speakingId,
            paused,
            voices,
            stop: ttsStop,
            toggle: ttsToggle,
          },
        },
        {
          provide: DataManagementService,
          useValue: { resetAllProgress, previewImport, applyImport, downloadExport },
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

  it('previews a valid backup without writing, then applies it only after confirmation', async () => {
    const component = create();
    const data = { version: 1 };
    previewImport.mockReturnValue({
      success: true,
      data,
      preview: { incoming: {}, current: {} },
    });
    applyImport.mockReturnValue({ success: true });
    const validInput = {
      files: [{ name: 'b.json', text: () => Promise.resolve('{"version":1}') }],
      value: 'file',
    } as unknown as HTMLInputElement;
    await component.onImportFile({ target: validInput } as unknown as Event);
    expect(previewImport).toHaveBeenCalledWith({ version: 1 });
    expect(applyImport).not.toHaveBeenCalled();
    expect(component.pendingImport()).not.toBeNull();

    component.confirmImport();
    expect(applyImport).toHaveBeenCalledWith(data);
    expect(component.pendingImport()).toBeNull();
    expect(component.importMessage()?.success).toBe(true);
  });

  it('cancel leaves data untouched', async () => {
    const component = create();
    previewImport.mockReturnValue({
      success: true,
      data: {},
      preview: { incoming: {}, current: {} },
    });
    const input = {
      files: [{ name: 'b.json', text: () => Promise.resolve('{}') }],
      value: 'file',
    } as unknown as HTMLInputElement;
    await component.onImportFile({ target: input } as unknown as Event);
    component.cancelImport();
    expect(applyImport).not.toHaveBeenCalled();
    expect(component.pendingImport()).toBeNull();
  });

  it('handles malformed JSON', async () => {
    const component = create();
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

  it('lists browser voices, saves a choice, and previews it', () => {
    voices.set([{ name: 'Samantha', lang: 'en-US', voiceURI: 'sam' } as SpeechSynthesisVoice]);
    const component = create();
    expect(component.voiceOptions().map((option) => option.label)).toEqual([
      'Automatic (best available)',
      'Samantha (en-US)',
    ]);
    expect(component.automaticVoiceLabel()).toBe('Samantha');
    settings.set({ ...DEFAULT_SETTINGS, speechVoiceUri: 'missing' });
    expect(component.savedVoiceMissing()).toBe(true);
    settings.set(DEFAULT_SETTINGS);

    component.setSpeechVoice('sam');
    expect(setSpeechVoice).toHaveBeenCalledWith('sam');
    component.setSpeechRate('1.15');
    expect(setSpeechRate).toHaveBeenCalledWith(1.15);
    speakingId.set(SPEECH_PREVIEW_ID);
    component.setSpeechVoice('');
    expect(setSpeechVoice).toHaveBeenLastCalledWith(null);
    expect(ttsStop).toHaveBeenCalledOnce();

    component.previewVoice();
    expect(ttsToggle).toHaveBeenCalledWith(
      SPEECH_PREVIEW_ID,
      expect.stringContaining('Skill Hunter'),
    );
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
