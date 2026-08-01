import { TestBed } from '@angular/core/testing';
import { DataManagementService } from './data-management.service';
import { ProgressStore } from './progress.store';
import { BookmarkService } from './bookmark.service';
import { PracticeService } from './practice.service';
import { RevisionService } from './revision.service';
import { SettingsService } from './settings.service';
import { ActivityService } from './activity.service';
import { NoteService } from './note.service';
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
        { provide: ProgressStore, useValue: { ...progressStore, progress: () => ({}), resetAll: vi.fn() } },
        { provide: BookmarkService, useValue: { ...bookmarkService, bookmarks: () => [], resetAll: vi.fn() } },
        { provide: PracticeService, useValue: { ...practiceService, history: () => [], resetAll: vi.fn() } },
        { provide: RevisionService, useValue: { ...revisionService, revisionTopicIds: () => [], resetAll: vi.fn() } },
        { provide: SettingsService, useValue: { ...settingsService, settings: () => DEFAULT_SETTINGS } },
        { provide: ActivityService, useValue: { ...activityService, activity: () => ({}), resetAll: vi.fn() } },
        { provide: NoteService, useValue: { ...noteService, notes: () => ({}), resetAll: vi.fn() } },
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
        't1': {
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
});
