import { TestBed } from '@angular/core/testing';
import { DataManagementService } from './data-management.service';
import { ProgressStore } from './progress.store';
import { BookmarkService } from './bookmark.service';
import { PracticeService } from './practice.service';
import { RevisionService } from './revision.service';
import { SettingsService } from './settings.service';
import { ActivityService } from './activity.service';
import { NoteService } from './note.service';
import { AiChatStore } from './ai-chat.store';
import { CURRENT_DATA_VERSION } from '../storage/storage-keys';
import { DEFAULT_SETTINGS } from '../models';

describe('DataManagementService', () => {
  let service: DataManagementService;
  let progressStore: { replaceAll: ReturnType<typeof vi.fn> };
  let bookmarkService: { replaceAll: ReturnType<typeof vi.fn> };
  let practiceService: { replaceAll: ReturnType<typeof vi.fn> };
  let revisionService: { replaceAll: ReturnType<typeof vi.fn> };
  let settingsService: { replaceAll: ReturnType<typeof vi.fn> };
  let activityService: { replaceAll: ReturnType<typeof vi.fn> };
  let noteService: { replaceAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    progressStore = { replaceAll: vi.fn() };
    bookmarkService = { replaceAll: vi.fn() };
    practiceService = { replaceAll: vi.fn() };
    revisionService = { replaceAll: vi.fn() };
    settingsService = { replaceAll: vi.fn() };
    activityService = { replaceAll: vi.fn() };
    noteService = { replaceAll: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        DataManagementService,
        {
          provide: ProgressStore,
          useValue: { ...progressStore, progress: () => ({}), resetAll: vi.fn() },
        },
        {
          provide: BookmarkService,
          useValue: { ...bookmarkService, bookmarks: () => [], resetAll: vi.fn() },
        },
        {
          provide: PracticeService,
          useValue: { ...practiceService, history: () => [], resetAll: vi.fn() },
        },
        {
          provide: RevisionService,
          useValue: { ...revisionService, revisionTopicIds: () => [], resetAll: vi.fn() },
        },
        {
          provide: SettingsService,
          useValue: { ...settingsService, settings: () => DEFAULT_SETTINGS },
        },
        {
          provide: ActivityService,
          useValue: { ...activityService, activity: () => ({}), resetAll: vi.fn() },
        },
        {
          provide: NoteService,
          useValue: { ...noteService, notes: () => ({}), resetAll: vi.fn() },
        },
        {
          provide: AiChatStore,
          useValue: {
            resetAll: vi.fn(),
            snapshot: () => ({ conversations: [], activeId: null }),
            replaceAll: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(DataManagementService);
  });

  it('rejects unsupported export versions', () => {
    const result = service.importFromJson({
      version: 999,
      progress: {},
      bookmarks: [],
      practiceHistory: [],
      revisionTopicIds: [],
      settings: DEFAULT_SETTINGS,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported export version');
    expect(progressStore.replaceAll).not.toHaveBeenCalled();
  });

  it('rejects invalid progress status enums', () => {
    const result = service.importFromJson({
      version: CURRENT_DATA_VERSION,
      progress: {
        t1: {
          topicId: 't1',
          subjectId: 'js',
          status: 'done',
          completedBlockIds: [],
          confidence: 'high',
          revisionCount: 0,
        },
      },
      bookmarks: [],
      practiceHistory: [],
      revisionTopicIds: [],
      settings: DEFAULT_SETTINGS,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('progress');
  });

  it('imports a valid export payload', () => {
    const payload = {
      version: CURRENT_DATA_VERSION,
      progress: {
        t1: {
          topicId: 't1',
          subjectId: 'js',
          status: 'completed',
          completedBlockIds: ['b1'],
          confidence: 'high',
          revisionCount: 1,
        },
      },
      bookmarks: [
        {
          id: 'bm1',
          entityId: 't1',
          entityType: 'topic',
          subjectId: 'js',
          topicId: 't1',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      practiceHistory: [],
      revisionTopicIds: ['t1'],
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
      activity: { '2026-01-01': 120 },
      notes: {
        t1: {
          topicId: 't1',
          subjectId: 'js',
          content: 'hello',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };

    const result = service.importFromJson(payload);
    expect(result.success).toBe(true);
    expect(progressStore.replaceAll).toHaveBeenCalledWith(payload.progress);
    expect(bookmarkService.replaceAll).toHaveBeenCalledWith(payload.bookmarks);
    expect(settingsService.replaceAll).toHaveBeenCalledWith(payload.settings);
    expect(activityService.replaceAll).toHaveBeenCalledWith(payload.activity);
    expect(noteService.replaceAll).toHaveBeenCalledWith(payload.notes);
  });

  describe('interface style in backups', () => {
    const base = {
      version: CURRENT_DATA_VERSION,
      progress: {},
      bookmarks: [],
      practiceHistory: [],
      revisionTopicIds: [],
    };

    it('accepts a known style and keeps older backups without one working', () => {
      const withStyle = service.previewImport({
        ...base,
        settings: { ...DEFAULT_SETTINGS, uiStyle: 'spatial' },
      });
      expect(withStyle.success && withStyle.data.settings.uiStyle).toBe('spatial');

      const legacySettings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
      delete legacySettings['uiStyle'];
      const legacy = service.previewImport({ ...base, settings: legacySettings });
      expect(legacy.success && legacy.data.settings.uiStyle).toBe('classic');
    });

    it('accepts the newer interface styles', () => {
      for (const uiStyle of ['brutalism', 'aurora', 'clay']) {
        const result = service.previewImport({
          ...base,
          settings: { ...DEFAULT_SETTINGS, uiStyle },
        });
        expect(result.success && result.data.settings.uiStyle, uiStyle).toBe(uiStyle);
      }
    });

    it('accepts the multi-color palette themes and a third custom color', () => {
      for (const colorTheme of [
        'northern',
        'glow',
        'reef',
        'tropical',
        'royal',
        'berry',
        'fjord',
        'candy',
      ]) {
        const result = service.previewImport({
          ...base,
          settings: { ...DEFAULT_SETTINGS, colorTheme },
        });
        expect(result.success && result.data.settings.colorTheme, colorTheme).toBe(colorTheme);
      }
      const custom = service.previewImport({
        ...base,
        settings: { ...DEFAULT_SETTINGS, colorTheme: 'custom', customTertiary: '#0ea5e9' },
      });
      expect(custom.success && custom.data.settings.customTertiary).toBe('#0ea5e9');
    });

    it('keeps a valid custom theme and ignores a malformed custom color', () => {
      const ok = service.previewImport({
        ...base,
        settings: {
          ...DEFAULT_SETTINGS,
          colorTheme: 'custom',
          customPrimary: '#4338ca',
          customAccent: '#f97316',
        },
      });
      expect(ok.success && ok.data.settings.customPrimary).toBe('#4338ca');
      expect(ok.success && ok.data.settings.customAccent).toBe('#f97316');

      const bad = service.previewImport({
        ...base,
        settings: {
          ...DEFAULT_SETTINGS,
          customPrimary: 'javascript:alert(1)',
          customAccent: 'red',
        },
      });
      expect(bad.success && bad.data.settings.customPrimary).toBe(DEFAULT_SETTINGS.customPrimary);
      expect(bad.success && bad.data.settings.customAccent).toBeNull();
    });

    it('rejects an unknown style', () => {
      const result = service.previewImport({
        ...base,
        settings: { ...DEFAULT_SETTINGS, uiStyle: 'holographic' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('import preview', () => {
    const backup = {
      version: CURRENT_DATA_VERSION,
      progress: {},
      bookmarks: [],
      practiceHistory: [],
      revisionTopicIds: ['a', 'b'],
      settings: DEFAULT_SETTINGS,
    };

    it('validates and summarises a backup without changing any data', () => {
      const result = service.previewImport(backup);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.preview.incoming.revisionTopics).toBe(2);
        expect(result.preview.current.revisionTopics).toBe(0);
      }
      expect(progressStore.replaceAll).not.toHaveBeenCalled();
      expect(revisionService.replaceAll).not.toHaveBeenCalled();
    });

    it('does not mutate anything for an invalid file', () => {
      const result = service.previewImport({ version: CURRENT_DATA_VERSION, progress: 5 });
      expect(result.success).toBe(false);
      expect(progressStore.replaceAll).not.toHaveBeenCalled();
    });

    it('restores the previous data if applying fails part-way', () => {
      const parsed = service.previewImport(backup);
      if (!parsed.success) throw new Error('expected a valid backup');
      progressStore.replaceAll.mockImplementationOnce(() => {
        throw new Error('storage full');
      });

      const result = service.applyImport(parsed.data);

      expect(result.success).toBe(false);
      expect(result.error).toContain('restored');
      // First call failed, second call wrote the snapshot back.
      expect(progressStore.replaceAll).toHaveBeenCalledTimes(2);
    });
  });
});
