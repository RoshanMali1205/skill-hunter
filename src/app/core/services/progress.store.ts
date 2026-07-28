import { Injectable, computed, inject, signal, untracked } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { ConfidenceLevel, TopicProgress } from '../models';

function createDefaultProgress(topicId: string, subjectId: string): TopicProgress {
  return {
    topicId,
    subjectId,
    status: 'not-started',
    completedBlockIds: [],
    confidence: 'not-rated',
    revisionCount: 0,
  };
}

@Injectable({ providedIn: 'root' })
export class ProgressStore {
  private readonly storage = inject(StorageService);

  private readonly _progress = signal<Record<string, TopicProgress>>(
    this.storage.get(STORAGE_KEYS.progress, {}),
  );

  readonly progress = this._progress.asReadonly();

  readonly completedCount = computed(
    () => Object.values(this._progress()).filter((p) => p.status === 'completed').length,
  );

  readonly inProgressCount = computed(
    () => Object.values(this._progress()).filter((p) => p.status === 'in-progress').length,
  );

  readonly lowConfidenceTopicIds = computed(() =>
    Object.values(this._progress())
      .filter((p) => p.confidence === 'low')
      .map((p) => p.topicId),
  );

  readonly recentlyVisited = computed(() =>
    Object.values(this._progress())
      .filter((p) => !!p.lastVisitedAt)
      .sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? '')),
  );

  getTopicProgress(topicId: string, subjectId: string): TopicProgress {
    return this._progress()[topicId] ?? createDefaultProgress(topicId, subjectId);
  }

  touchLastVisited(topicId: string, subjectId: string): void {
    this.update(topicId, subjectId, (current) => ({
      ...current,
      lastVisitedAt: new Date().toISOString(),
      status: current.status === 'not-started' ? 'in-progress' : current.status,
    }));
  }

  toggleBlockComplete(topicId: string, subjectId: string, blockId: string): void {
    this.update(topicId, subjectId, (current) => {
      const has = current.completedBlockIds.includes(blockId);
      const completedBlockIds = has
        ? current.completedBlockIds.filter((id) => id !== blockId)
        : [...current.completedBlockIds, blockId];
      return {
        ...current,
        completedBlockIds,
        status: current.status === 'not-started' ? 'in-progress' : current.status,
      };
    });
  }

  markComplete(topicId: string, subjectId: string): void {
    this.update(topicId, subjectId, (current) => ({
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
    }));
  }

  markIncomplete(topicId: string, subjectId: string): void {
    this.update(topicId, subjectId, (current) => ({
      ...current,
      status: 'in-progress',
      completedAt: undefined,
    }));
  }

  setConfidence(topicId: string, subjectId: string, confidence: ConfidenceLevel): void {
    this.update(topicId, subjectId, (current) => ({ ...current, confidence }));
  }

  incrementRevisionCount(topicId: string, subjectId: string): void {
    this.update(topicId, subjectId, (current) => ({
      ...current,
      revisionCount: current.revisionCount + 1,
    }));
  }

  resetAll(): void {
    this._progress.set({});
    this.persist();
  }

  replaceAll(progress: Record<string, TopicProgress>): void {
    this._progress.set(progress);
    this.persist();
  }

  private update(
    topicId: string,
    subjectId: string,
    updater: (current: TopicProgress) => TopicProgress,
  ): void {
    const current = untracked(() => this.getTopicProgress(topicId, subjectId));
    this._progress.update((all) => ({ ...all, [topicId]: updater(current) }));
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.progress, this._progress());
  }
}
