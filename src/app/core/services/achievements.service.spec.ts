import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { ActivityService } from './activity.service';
import { AchievementsService } from './achievements.service';
import { BookmarkService } from './bookmark.service';
import { NoteService } from './note.service';
import { PracticeService } from './practice.service';
import { ProfileService } from './profile.service';
import { ProgressStore } from './progress.store';

interface AchievementInternals {
  syncUnlocks(): void;
}

describe('AchievementsService', () => {
  const completedCount = signal(0);
  const currentStreak = signal(0);
  const longestStreak = signal(0);
  const activity = signal<Record<string, number>>({});
  const questionsAttempted = signal(0);
  const accuracy = signal(0);
  const bookmarks = signal<unknown[]>([]);
  const notes = signal<Record<string, unknown>>({});
  const photoDataUrl = signal<string | null>(null);
  const set = vi.fn();
  let service: AchievementsService;

  beforeEach(() => {
    completedCount.set(0);
    currentStreak.set(0);
    longestStreak.set(0);
    activity.set({});
    questionsAttempted.set(0);
    accuracy.set(0);
    bookmarks.set([]);
    notes.set({});
    photoDataUrl.set(null);
    set.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-20T10:00:00.000Z'));
    TestBed.configureTestingModule({
      providers: [
        AchievementsService,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
        { provide: ProgressStore, useValue: { completedCount } },
        { provide: ActivityService, useValue: { currentStreak, longestStreak, activity } },
        { provide: PracticeService, useValue: { questionsAttempted, accuracy } },
        { provide: BookmarkService, useValue: { bookmarks } },
        { provide: NoteService, useValue: { notes } },
        { provide: ProfileService, useValue: { photoDataUrl } },
      ],
    });
    service = TestBed.inject(AchievementsService);
  });

  afterEach(() => vi.useRealTimers());

  function sync(): void {
    (service as unknown as AchievementInternals).syncUnlocks();
  }

  it('starts locked and exposes the definition count', () => {
    expect(service.unlockedCount()).toBe(0);
    expect(service.totalCount).toBeGreaterThan(0);
    expect(service.items().every((item) => !item.unlocked)).toBe(true);
  });

  it('unlocks achievements from live study signals without duplicates', () => {
    completedCount.set(10);
    currentStreak.set(3);
    questionsAttempted.set(10);
    accuracy.set(80);
    bookmarks.set([{}]);
    notes.set({ signals: {} });
    activity.set({ '2026-08-20': 3600 });
    photoDataUrl.set('data:image/jpeg;base64,x');
    sync();

    const ids = service.state().unlocked.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'first-steps',
        'topics-10',
        'streak-3',
        'practice-first',
        'accuracy-80',
        'first-bookmark',
        'first-note',
        'study-hour',
        'profile-photo',
      ]),
    );
    const count = service.unlockedCount();
    sync();
    expect(service.unlockedCount()).toBe(count);
    expect(set).toHaveBeenCalledWith(STORAGE_KEYS.achievements, service.state());
  });

  it('sorts recent unlocks and resets all state', () => {
    service.replaceAll({
      unlocked: [
        { id: 'first-steps', unlockedAt: '2026-08-18T00:00:00.000Z' },
        { id: 'practice-first', unlockedAt: '2026-08-20T00:00:00.000Z' },
        { id: 'first-note', unlockedAt: '2026-08-19T00:00:00.000Z' },
        { id: 'first-bookmark', unlockedAt: '2026-08-17T00:00:00.000Z' },
      ],
    });
    expect(service.recentlyUnlocked().map((item) => item.id)).toEqual([
      'practice-first',
      'first-note',
      'first-steps',
    ]);
    service.resetAll();
    expect(service.unlockedCount()).toBe(0);
  });
});
