import { Injectable, inject } from '@angular/core';
import { ProgressStore } from './progress.store';
import { BookmarkService } from './bookmark.service';
import { PracticeService } from './practice.service';
import { RevisionService } from './revision.service';
import { SettingsService } from './settings.service';
import { ActivityService } from './activity.service';
import { NoteService } from './note.service';
import { AiChatStore } from './ai-chat.store';
import { CURRENT_DATA_VERSION } from '../storage/storage-keys';
import {
  ActivityLog,
  AppSettings,
  Bookmark,
  ConfidenceLevel,
  DEFAULT_SETTINGS,
  Note,
  PracticeAttempt,
  StoredApplicationData,
  TopicProgress,
  TopicStatus,
} from '../models';

const TOPIC_STATUSES: TopicStatus[] = ['not-started', 'in-progress', 'completed'];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['not-rated', 'low', 'medium', 'high'];
const BOOKMARK_TYPES = ['topic', 'question'] as const;
const PRACTICE_RESULTS = ['correct', 'incorrect', 'needs-revision'] as const;
const THEMES = ['light', 'dark'] as const;
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced'] as const;

@Injectable({ providedIn: 'root' })
export class DataManagementService {
  private readonly progressStore = inject(ProgressStore);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly practiceService = inject(PracticeService);
  private readonly revisionService = inject(RevisionService);
  private readonly settingsService = inject(SettingsService);
  private readonly activityService = inject(ActivityService);
  private readonly noteService = inject(NoteService);
  private readonly aiChatStore = inject(AiChatStore);

  buildExport(): StoredApplicationData {
    return {
      version: CURRENT_DATA_VERSION,
      progress: this.progressStore.progress(),
      bookmarks: this.bookmarkService.bookmarks(),
      practiceHistory: this.practiceService.history(),
      revisionTopicIds: this.revisionService.revisionTopicIds(),
      settings: this.settingsService.settings(),
      activity: this.activityService.activity(),
      notes: this.noteService.notes(),
    };
  }

  downloadExport(): void {
    const data = this.buildExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skill-hunter-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importFromJson(raw: unknown): { success: boolean; error?: string } {
    const parsed = this.parseStoredData(raw);
    if (!parsed.ok) {
      return { success: false, error: parsed.error };
    }

    const data = parsed.data;
    this.progressStore.replaceAll(data.progress);
    this.bookmarkService.replaceAll(data.bookmarks);
    this.practiceService.replaceAll(data.practiceHistory);
    this.revisionService.replaceAll(data.revisionTopicIds);
    this.settingsService.replaceAll(data.settings);
    this.activityService.replaceAll(data.activity ?? {});
    this.noteService.replaceAll(data.notes ?? {});

    return { success: true };
  }

  resetAllProgress(): void {
    this.progressStore.resetAll();
    this.bookmarkService.resetAll();
    this.practiceService.resetAll();
    this.revisionService.resetAll();
    this.activityService.resetAll();
    this.noteService.resetAll();
    this.aiChatStore.resetAll();
  }

  private parseStoredData(
    raw: unknown,
  ): { ok: true; data: StoredApplicationData } | { ok: false; error: string } {
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: 'This file is not a valid Skill Hunter export.' };
    }
    const candidate = raw as Record<string, unknown>;

    if (typeof candidate['version'] !== 'number') {
      return { ok: false, error: 'This file is not a valid Skill Hunter export.' };
    }
    if (candidate['version'] !== CURRENT_DATA_VERSION) {
      return {
        ok: false,
        error: `Unsupported export version (${candidate['version']}). This app expects version ${CURRENT_DATA_VERSION}.`,
      };
    }

    const progress = this.parseProgress(candidate['progress']);
    if (!progress) {
      return { ok: false, error: 'Export has invalid progress entries.' };
    }

    const bookmarks = this.parseBookmarks(candidate['bookmarks']);
    if (!bookmarks) {
      return { ok: false, error: 'Export has invalid bookmark entries.' };
    }

    const practiceHistory = this.parsePracticeHistory(candidate['practiceHistory']);
    if (!practiceHistory) {
      return { ok: false, error: 'Export has invalid practice history entries.' };
    }

    const revisionTopicIds = this.parseStringArray(candidate['revisionTopicIds']);
    if (!revisionTopicIds) {
      return { ok: false, error: 'Export has invalid revision topic ids.' };
    }

    const settings = this.parseSettings(candidate['settings']);
    if (!settings) {
      return { ok: false, error: 'Export has invalid settings.' };
    }

    let activity: ActivityLog | undefined;
    if (candidate['activity'] !== undefined) {
      const parsedActivity = this.parseActivity(candidate['activity']);
      if (!parsedActivity) {
        return { ok: false, error: 'Export has invalid activity log entries.' };
      }
      activity = parsedActivity;
    }

    let notes: Record<string, Note> | undefined;
    if (candidate['notes'] !== undefined) {
      const parsedNotes = this.parseNotes(candidate['notes']);
      if (!parsedNotes) {
        return { ok: false, error: 'Export has invalid note entries.' };
      }
      notes = parsedNotes;
    }

    return {
      ok: true,
      data: {
        version: CURRENT_DATA_VERSION,
        progress,
        bookmarks,
        practiceHistory,
        revisionTopicIds,
        settings,
        activity,
        notes,
      },
    };
  }

  private parseProgress(value: unknown): Record<string, TopicProgress> | null {
    if (!this.isPlainObject(value)) return null;
    const result: Record<string, TopicProgress> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (!this.isPlainObject(entry)) return null;
      if (typeof entry['topicId'] !== 'string' || typeof entry['subjectId'] !== 'string') return null;
      if (!this.isOneOf(entry['status'], TOPIC_STATUSES)) return null;
      if (!this.isOneOf(entry['confidence'], CONFIDENCE_LEVELS)) return null;
      if (!Array.isArray(entry['completedBlockIds']) || !entry['completedBlockIds'].every((id) => typeof id === 'string')) {
        return null;
      }
      if (typeof entry['revisionCount'] !== 'number' || !Number.isFinite(entry['revisionCount'])) {
        return null;
      }
      if (entry['lastVisitedAt'] !== undefined && typeof entry['lastVisitedAt'] !== 'string') return null;
      if (entry['completedAt'] !== undefined && typeof entry['completedAt'] !== 'string') return null;

      result[key] = {
        topicId: entry['topicId'],
        subjectId: entry['subjectId'],
        status: entry['status'],
        completedBlockIds: entry['completedBlockIds'],
        confidence: entry['confidence'],
        lastVisitedAt: entry['lastVisitedAt'],
        completedAt: entry['completedAt'],
        revisionCount: entry['revisionCount'],
      };
    }
    return result;
  }

  private parseBookmarks(value: unknown): Bookmark[] | null {
    if (!Array.isArray(value)) return null;
    const result: Bookmark[] = [];
    for (const entry of value) {
      if (!this.isPlainObject(entry)) return null;
      if (typeof entry['id'] !== 'string') return null;
      if (typeof entry['entityId'] !== 'string') return null;
      if (!this.isOneOf(entry['entityType'], BOOKMARK_TYPES)) return null;
      if (typeof entry['subjectId'] !== 'string') return null;
      if (typeof entry['topicId'] !== 'string') return null;
      if (typeof entry['createdAt'] !== 'string') return null;
      result.push({
        id: entry['id'],
        entityId: entry['entityId'],
        entityType: entry['entityType'],
        subjectId: entry['subjectId'],
        topicId: entry['topicId'],
        createdAt: entry['createdAt'],
      });
    }
    return result;
  }

  private parsePracticeHistory(value: unknown): PracticeAttempt[] | null {
    if (!Array.isArray(value)) return null;
    const result: PracticeAttempt[] = [];
    for (const entry of value) {
      if (!this.isPlainObject(entry)) return null;
      if (typeof entry['id'] !== 'string') return null;
      if (typeof entry['questionId'] !== 'string') return null;
      if (typeof entry['topicId'] !== 'string') return null;
      if (typeof entry['subjectId'] !== 'string') return null;
      if (!this.isOneOf(entry['result'], PRACTICE_RESULTS)) return null;
      if (typeof entry['attemptedAt'] !== 'string') return null;
      if (
        entry['timeSpentSeconds'] !== undefined &&
        (typeof entry['timeSpentSeconds'] !== 'number' || !Number.isFinite(entry['timeSpentSeconds']))
      ) {
        return null;
      }
      result.push({
        id: entry['id'],
        questionId: entry['questionId'],
        topicId: entry['topicId'],
        subjectId: entry['subjectId'],
        result: entry['result'],
        attemptedAt: entry['attemptedAt'],
        timeSpentSeconds: entry['timeSpentSeconds'],
      });
    }
    return result;
  }

  private parseSettings(value: unknown): AppSettings | null {
    if (!this.isPlainObject(value)) return null;
    const theme = this.isOneOf(value['theme'], THEMES) ? value['theme'] : DEFAULT_SETTINGS.theme;
    const defaultDifficulty = this.isOneOf(value['defaultDifficulty'], DIFFICULTIES)
      ? value['defaultDifficulty']
      : DEFAULT_SETTINGS.defaultDifficulty;
    const showAnswersAutomatically =
      typeof value['showAnswersAutomatically'] === 'boolean'
        ? value['showAnswersAutomatically']
        : DEFAULT_SETTINGS.showAnswersAutomatically;
    const dailyGoalMinutes =
      typeof value['dailyGoalMinutes'] === 'number' &&
      Number.isFinite(value['dailyGoalMinutes']) &&
      value['dailyGoalMinutes'] > 0
        ? value['dailyGoalMinutes']
        : DEFAULT_SETTINGS.dailyGoalMinutes;

    // Reject clearly hostile/non-object junk that somehow passed the plain-object check
    // but still require at least one recognized settings field from a real export.
    if (
      value['theme'] !== undefined &&
      !this.isOneOf(value['theme'], THEMES)
    ) {
      return null;
    }
    if (
      value['defaultDifficulty'] !== undefined &&
      !this.isOneOf(value['defaultDifficulty'], DIFFICULTIES)
    ) {
      return null;
    }
    if (
      value['showAnswersAutomatically'] !== undefined &&
      typeof value['showAnswersAutomatically'] !== 'boolean'
    ) {
      return null;
    }
    if (
      value['dailyGoalMinutes'] !== undefined &&
      (typeof value['dailyGoalMinutes'] !== 'number' ||
        !Number.isFinite(value['dailyGoalMinutes']) ||
        value['dailyGoalMinutes'] <= 0)
    ) {
      return null;
    }

    return {
      theme,
      defaultDifficulty,
      showAnswersAutomatically,
      dailyGoalMinutes,
    };
  }

  private parseActivity(value: unknown): ActivityLog | null {
    if (!this.isPlainObject(value)) return null;
    const result: ActivityLog = {};
    for (const [key, seconds] of Object.entries(value)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
      if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return null;
      result[key] = seconds;
    }
    return result;
  }

  private parseNotes(value: unknown): Record<string, Note> | null {
    if (!this.isPlainObject(value)) return null;
    const result: Record<string, Note> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (!this.isPlainObject(entry)) return null;
      if (typeof entry['topicId'] !== 'string') return null;
      if (typeof entry['subjectId'] !== 'string') return null;
      if (typeof entry['content'] !== 'string') return null;
      if (typeof entry['updatedAt'] !== 'string') return null;
      result[key] = {
        topicId: entry['topicId'],
        subjectId: entry['subjectId'],
        content: entry['content'],
        updatedAt: entry['updatedAt'],
      };
    }
    return result;
  }

  private parseStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    if (!value.every((item) => typeof item === 'string')) return null;
    return value;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value);
  }
}
