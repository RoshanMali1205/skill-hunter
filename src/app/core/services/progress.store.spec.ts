import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { TopicProgress } from '../models';
import { ProgressStore } from './progress.store';

describe('ProgressStore', () => {
  let store: ProgressStore;
  let set: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    set = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ProgressStore,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
      ],
    });
    store = TestBed.inject(ProgressStore);
  });

  afterEach(() => vi.useRealTimers());

  it('returns default progress without persisting it', () => {
    expect(store.getTopicProgress('signals', 'angular')).toEqual({
      topicId: 'signals',
      subjectId: 'angular',
      status: 'not-started',
      completedBlockIds: [],
      confidence: 'not-rated',
      revisionCount: 0,
    });
    expect(set).not.toHaveBeenCalled();
  });

  it('starts a topic when a content block is toggled and can untoggle it', () => {
    store.toggleBlockComplete('signals', 'angular', 'concept-1');
    expect(store.getTopicProgress('signals', 'angular')).toMatchObject({
      status: 'in-progress',
      completedBlockIds: ['concept-1'],
    });

    store.toggleBlockComplete('signals', 'angular', 'concept-1');
    expect(store.getTopicProgress('signals', 'angular').completedBlockIds).toEqual([]);
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.progress, store.progress());
  });

  it('records completion and removes the completion date when reopened', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T10:30:00.000Z'));

    store.markComplete('signals', 'angular');
    expect(store.getTopicProgress('signals', 'angular')).toMatchObject({
      status: 'completed',
      completedAt: '2026-08-19T10:30:00.000Z',
    });

    store.markIncomplete('signals', 'angular');
    expect(store.getTopicProgress('signals', 'angular')).toMatchObject({
      status: 'in-progress',
      completedAt: undefined,
    });
  });

  it('updates confidence and revision count while preserving topic state', () => {
    store.setConfidence('signals', 'angular', 'low');
    store.incrementRevisionCount('signals', 'angular');
    store.incrementRevisionCount('signals', 'angular');

    expect(store.getTopicProgress('signals', 'angular')).toMatchObject({
      confidence: 'low',
      revisionCount: 2,
      status: 'not-started',
    });
  });

  it('derives counts, weak topics, and recent visits from imported progress', () => {
    const progress: Record<string, TopicProgress> = {
      old: {
        topicId: 'old',
        subjectId: 'js',
        status: 'completed',
        completedBlockIds: [],
        confidence: 'high',
        revisionCount: 0,
        lastVisitedAt: '2026-08-17T10:00:00.000Z',
      },
      recent: {
        topicId: 'recent',
        subjectId: 'js',
        status: 'in-progress',
        completedBlockIds: [],
        confidence: 'low',
        revisionCount: 0,
        lastVisitedAt: '2026-08-19T10:00:00.000Z',
      },
      untouched: {
        topicId: 'untouched',
        subjectId: 'js',
        status: 'not-started',
        completedBlockIds: [],
        confidence: 'not-rated',
        revisionCount: 0,
      },
    };

    store.replaceAll(progress);

    expect(store.completedCount()).toBe(1);
    expect(store.inProgressCount()).toBe(1);
    expect(store.lowConfidenceTopicIds()).toEqual(['recent']);
    expect(store.recentlyVisited().map((item) => item.topicId)).toEqual(['recent', 'old']);
  });
});
