import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let set: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20, 12));
    set = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        ActivityService,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
      ],
    });
    service = TestBed.inject(ActivityService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('tracks active visible time in fifteen-second ticks', () => {
    vi.advanceTimersByTime(30_000);
    expect(service.activity()['2026-08-20']).toBe(30);
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.activity, service.activity());
  });

  it('computes daily, weekly, current, and longest streak metrics', () => {
    service.replaceAll({
      '2026-08-12': 60,
      '2026-08-13': 60,
      '2026-08-18': 120,
      '2026-08-19': 180,
      '2026-08-20': 240,
    });
    expect(service.minutesOn('2026-08-20')).toBe(4);
    expect(service.todayMinutes()).toBe(4);
    expect(service.weekMinutes()).toBe(9);
    expect(service.currentStreak()).toBe(3);
    expect(service.longestStreak()).toBe(3);
  });

  it('allows today to be empty while preserving yesterday streak', () => {
    service.replaceAll({ '2026-08-18': 60, '2026-08-19': 60 });
    expect(service.currentStreak()).toBe(2);
    service.resetAll();
    expect(service.activity()).toEqual({});
  });
});
