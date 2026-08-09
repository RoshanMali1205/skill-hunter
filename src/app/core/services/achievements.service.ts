import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import {
  ACHIEVEMENT_DEFINITIONS,
  AchievementDefinition,
  AchievementId,
  AchievementsState,
  DEFAULT_ACHIEVEMENTS,
  UnlockedAchievement,
} from '../models';
import { ProgressStore } from './progress.store';
import { ActivityService } from './activity.service';
import { PracticeService } from './practice.service';
import { BookmarkService } from './bookmark.service';
import { NoteService } from './note.service';
import { ProfileService } from './profile.service';

interface AchievementContext {
  completedTopics: number;
  currentStreak: number;
  longestStreak: number;
  practiceAttempts: number;
  practiceAccuracy: number;
  bookmarkCount: number;
  noteCount: number;
  totalStudyMinutes: number;
  hasPhoto: boolean;
}

export interface AchievementView extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly storage = inject(StorageService);
  private readonly progressStore = inject(ProgressStore);
  private readonly activityService = inject(ActivityService);
  private readonly practiceService = inject(PracticeService);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly noteService = inject(NoteService);
  private readonly profileService = inject(ProfileService);

  private readonly _state = signal<AchievementsState>(
    this.storage.get(STORAGE_KEYS.achievements, DEFAULT_ACHIEVEMENTS),
  );

  readonly state = this._state.asReadonly();

  private readonly unlockedMap = computed(() => {
    const map = new Map<AchievementId, UnlockedAchievement>();
    for (const item of this._state().unlocked) {
      map.set(item.id, item);
    }
    return map;
  });

  readonly items = computed<AchievementView[]>(() => {
    const unlocked = this.unlockedMap();
    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      const entry = unlocked.get(def.id);
      return {
        ...def,
        unlocked: !!entry,
        unlockedAt: entry?.unlockedAt,
      };
    });
  });

  readonly unlockedCount = computed(() => this.items().filter((item) => item.unlocked).length);

  readonly totalCount = ACHIEVEMENT_DEFINITIONS.length;

  readonly recentlyUnlocked = computed(() =>
    this.items()
      .filter((item) => item.unlocked && item.unlockedAt)
      .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
      .slice(0, 3),
  );

  constructor() {
    effect(() => {
      // Track live progress signals so unlocks appear as the user studies.
      this.progressStore.completedCount();
      this.activityService.currentStreak();
      this.activityService.longestStreak();
      this.activityService.activity();
      this.practiceService.questionsAttempted();
      this.practiceService.accuracy();
      this.bookmarkService.bookmarks();
      this.noteService.notes();
      this.profileService.photoDataUrl();

      untracked(() => this.syncUnlocks());
    });
  }

  replaceAll(state: AchievementsState): void {
    this._state.set(state);
    this.persist();
  }

  resetAll(): void {
    this._state.set(DEFAULT_ACHIEVEMENTS);
    this.persist();
  }

  private syncUnlocks(): void {
    const ctx = this.buildContext();
    const existing = new Map(this.unlockedMap());
    let changed = false;
    const now = new Date().toISOString();

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (existing.has(def.id)) continue;
      if (!this.isEarned(def.id, ctx)) continue;
      existing.set(def.id, { id: def.id, unlockedAt: now });
      changed = true;
    }

    if (!changed) return;

    this._state.set({
      unlocked: Array.from(existing.values()).sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt)),
    });
    this.persist();
  }

  private buildContext(): AchievementContext {
    const activity = this.activityService.activity();
    const totalSeconds = Object.values(activity).reduce((sum, seconds) => sum + seconds, 0);

    return {
      completedTopics: this.progressStore.completedCount(),
      currentStreak: this.activityService.currentStreak(),
      longestStreak: this.activityService.longestStreak(),
      practiceAttempts: this.practiceService.questionsAttempted(),
      practiceAccuracy: this.practiceService.accuracy(),
      bookmarkCount: this.bookmarkService.bookmarks().length,
      noteCount: Object.keys(this.noteService.notes()).length,
      totalStudyMinutes: Math.round(totalSeconds / 60),
      hasPhoto: !!this.profileService.photoDataUrl(),
    };
  }

  private isEarned(id: AchievementId, ctx: AchievementContext): boolean {
    switch (id) {
      case 'first-steps':
        return ctx.completedTopics >= 1;
      case 'topics-10':
        return ctx.completedTopics >= 10;
      case 'topics-25':
        return ctx.completedTopics >= 25;
      case 'topics-50':
        return ctx.completedTopics >= 50;
      case 'streak-3':
        return Math.max(ctx.currentStreak, ctx.longestStreak) >= 3;
      case 'streak-7':
        return Math.max(ctx.currentStreak, ctx.longestStreak) >= 7;
      case 'streak-14':
        return Math.max(ctx.currentStreak, ctx.longestStreak) >= 14;
      case 'streak-30':
        return Math.max(ctx.currentStreak, ctx.longestStreak) >= 30;
      case 'practice-first':
        return ctx.practiceAttempts >= 1;
      case 'practice-25':
        return ctx.practiceAttempts >= 25;
      case 'practice-100':
        return ctx.practiceAttempts >= 100;
      case 'accuracy-80':
        return ctx.practiceAttempts >= 10 && ctx.practiceAccuracy >= 80;
      case 'first-bookmark':
        return ctx.bookmarkCount >= 1;
      case 'first-note':
        return ctx.noteCount >= 1;
      case 'study-hour':
        return ctx.totalStudyMinutes >= 60;
      case 'profile-photo':
        return ctx.hasPhoto;
      default:
        return false;
    }
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.achievements, this._state());
  }
}
