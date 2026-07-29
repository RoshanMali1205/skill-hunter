import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { ActivityLog } from '../models';
import { addDays, dateKey } from '../../shared/date-key';

const TICK_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly storage = inject(StorageService);

  private readonly _activity = signal<ActivityLog>(this.storage.get(STORAGE_KEYS.activity, {}));

  readonly activity = this._activity.asReadonly();

  constructor() {
    if (typeof document === 'undefined') return;
    setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        this.addSeconds(TICK_MS / 1000);
      }
    }, TICK_MS);
  }

  minutesOn(date: string): number {
    return Math.round((this._activity()[date] ?? 0) / 60);
  }

  readonly todayMinutes = computed(() => this.minutesOn(dateKey()));

  readonly weekMinutes = computed(() => {
    const activity = this._activity();
    let total = 0;
    let cursor = new Date();
    for (let i = 0; i < 7; i++) {
      total += activity[dateKey(cursor)] ?? 0;
      cursor = addDays(cursor, -1);
    }
    return Math.round(total / 60);
  });

  readonly currentStreak = computed(() => {
    const activity = this._activity();
    let cursor = new Date();
    if (!(activity[dateKey(cursor)] > 0)) {
      cursor = addDays(cursor, -1);
    }
    let streak = 0;
    while (activity[dateKey(cursor)] > 0) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  });

  readonly longestStreak = computed(() => {
    const activity = this._activity();
    const days = Object.keys(activity)
      .filter((key) => activity[key] > 0)
      .sort();

    let longest = 0;
    let run = 0;
    let prevTime: number | null = null;

    for (const key of days) {
      const time = new Date(`${key}T00:00:00`).getTime();
      run = prevTime !== null && time - prevTime === 86_400_000 ? run + 1 : 1;
      longest = Math.max(longest, run);
      prevTime = time;
    }

    return Math.max(longest, this.currentStreak());
  });

  replaceAll(activity: ActivityLog): void {
    this._activity.set(activity);
    this.persist();
  }

  resetAll(): void {
    this._activity.set({});
    this.persist();
  }

  private addSeconds(seconds: number): void {
    const key = dateKey();
    this._activity.update((all) => ({ ...all, [key]: (all[key] ?? 0) + seconds }));
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.activity, this._activity());
  }
}
