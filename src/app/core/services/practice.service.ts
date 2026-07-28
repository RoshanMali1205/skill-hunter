import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { PracticeAttempt, Topic } from '../models';
import { PracticeFilter, PracticeQuestion } from '../models/filters.models';

@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly storage = inject(StorageService);

  private readonly _history = signal<PracticeAttempt[]>(
    this.storage.get(STORAGE_KEYS.practiceHistory, []),
  );

  readonly history = this._history.asReadonly();

  readonly questionsAttempted = computed(() => this._history().length);

  readonly correctAnswers = computed(
    () => this._history().filter((a) => a.result === 'correct').length,
  );

  readonly accuracy = computed(() => {
    const total = this.questionsAttempted();
    return total === 0 ? 0 : Math.round((this.correctAnswers() / total) * 100);
  });

  readonly incorrectTopicIds = computed(
    () =>
      new Set(
        this._history()
          .filter((a) => a.result === 'incorrect' || a.result === 'needs-revision')
          .map((a) => a.topicId),
      ),
  );

  buildQuestionPool(
    topics: Topic[],
    filter: PracticeFilter,
    bookmarkedQuestionIds: Set<string>,
    weakTopicIds: Set<string>,
  ): PracticeQuestion[] {
    let pool: PracticeQuestion[] = [];

    for (const topic of topics) {
      if (filter.topicId && topic.id !== filter.topicId) continue;
      if (filter.categoryId && topic.categoryId !== filter.categoryId) continue;
      if (filter.difficulty && filter.difficulty !== 'all' && topic.difficulty !== filter.difficulty) continue;
      if (filter.onlyWeak && !weakTopicIds.has(topic.id)) continue;

      for (const block of topic.blocks) {
        if (!('question' in block)) continue;
        if (filter.questionType && filter.questionType !== 'all' && block.type !== filter.questionType) continue;
        if (filter.onlyBookmarked && !bookmarkedQuestionIds.has(block.id)) continue;

        pool.push({
          block,
          topicId: topic.id,
          topicTitle: topic.title,
          subjectId: topic.subjectId,
          difficulty: topic.difficulty,
        });
      }
    }

    if (filter.random) {
      pool = this.shuffle(pool);
    }

    return pool;
  }

  recordAttempt(
    questionId: string,
    topicId: string,
    subjectId: string,
    result: PracticeAttempt['result'],
    timeSpentSeconds?: number,
  ): void {
    const attempt: PracticeAttempt = {
      id: `${questionId}-${Date.now()}`,
      questionId,
      topicId,
      subjectId,
      result,
      attemptedAt: new Date().toISOString(),
      timeSpentSeconds,
    };
    this._history.update((all) => [...all, attempt]);
    this.persist();
  }

  replaceAll(history: PracticeAttempt[]): void {
    this._history.set(history);
    this.persist();
  }

  resetAll(): void {
    this._history.set([]);
    this.persist();
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.practiceHistory, this._history());
  }
}
