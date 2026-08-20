import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { BookmarkService } from './bookmark.service';

describe('BookmarkService', () => {
  let service: BookmarkService;
  let set: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    set = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
      ],
    });
    service = TestBed.inject(BookmarkService);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T08:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('toggles a topic bookmark on and off', () => {
    service.toggleTopicBookmark('signals', 'angular');
    expect(service.isTopicBookmarked('signals')).toBe(true);
    expect(service.bookmarks()[0]).toEqual({
      id: 'topic-signals',
      entityId: 'signals',
      entityType: 'topic',
      subjectId: 'angular',
      topicId: 'signals',
      createdAt: '2026-08-19T08:00:00.000Z',
    });

    service.toggleTopicBookmark('signals', 'angular');
    expect(service.isTopicBookmarked('signals')).toBe(false);
    expect(service.bookmarks()).toEqual([]);
  });

  it('keeps topic and question bookmark indexes separate', () => {
    service.toggleTopicBookmark('signals', 'angular');
    service.toggleQuestionBookmark('q1', 'signals', 'angular');

    expect(service.bookmarkedTopicIds()).toEqual(new Set(['signals']));
    expect(service.bookmarkedQuestionIds()).toEqual(new Set(['q1']));
    expect(service.isQuestionBookmarked('q1')).toBe(true);
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.bookmarks, service.bookmarks());
  });

  it('replaces and resets the complete bookmark collection', () => {
    service.replaceAll([
      {
        id: 'topic-rxjs',
        entityId: 'rxjs',
        entityType: 'topic',
        subjectId: 'angular',
        topicId: 'rxjs',
        createdAt: '2026-08-18T08:00:00.000Z',
      },
    ]);
    expect(service.isTopicBookmarked('rxjs')).toBe(true);

    service.resetAll();
    expect(service.bookmarks()).toEqual([]);
  });
});
