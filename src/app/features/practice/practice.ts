import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { BookmarkService } from '../../core/services/bookmark.service';
import { PracticeService } from '../../core/services/practice.service';
import { RevisionService } from '../../core/services/revision.service';
import { SettingsService } from '../../core/services/settings.service';
import { PracticeFilter } from '../../core/models/filters.models';
import { QuestionCardComponent } from '../../shared/components/question-card/question-card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-practice',
  imports: [FormsModule, QuestionCardComponent, EmptyStateComponent, IconComponent],
  templateUrl: './practice.html',
  styleUrl: './practice.scss',
})
export class PracticeComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly practiceService = inject(PracticeService);
  private readonly revisionService = inject(RevisionService);
  private readonly settingsService = inject(SettingsService);

  readonly settings = this.settingsService.settings;

  subjectId = input<string>();
  topicId = input<string>();

  readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly filter = signal<PracticeFilter>({
    difficulty: 'all',
    questionType: 'all',
    onlyBookmarked: false,
    onlyWeak: false,
    random: true,
  });

  constructor() {
    effect(() => {
      const subjectId = this.subjectId();
      const topicId = this.topicId();
      if (subjectId || topicId) {
        this.filter.update((current) => ({
          ...current,
          subjectId: subjectId ?? current.subjectId,
          topicId: topicId ?? current.topicId,
        }));
      }
    });
  }

  readonly selectedSubjectCategories = computed(() => {
    const subject = this.subjects().find((s) => s.id === this.filter().subjectId);
    return subject?.categories ?? [];
  });

  private readonly availableTopics = toSignal(
    combineLatest([toObservable(this.filter), toObservable(this.subjects)]).pipe(
      switchMap(([filter, subjects]) => {
        const subjectIds = filter.subjectId ? [filter.subjectId] : subjects.map((s) => s.id);
        if (subjectIds.length === 0) return of([]);
        return forkJoin(subjectIds.map((id) => this.contentService.getSubjectTopics(id))).pipe(
          map((lists) => lists.flat()),
        );
      }),
    ),
    { initialValue: [] },
  );

  readonly weakTopicIds = computed(() => {
    const ids = new Set(this.progressStore.lowConfidenceTopicIds());
    this.practiceService.incorrectTopicIds().forEach((id) => ids.add(id));
    this.revisionService.revisionTopicIds().forEach((id) => ids.add(id));
    return ids;
  });

  private readonly previewPool = computed(() =>
    this.practiceService.buildQuestionPool(
      this.availableTopics(),
      this.filter(),
      this.bookmarkService.bookmarkedQuestionIds(),
      this.weakTopicIds(),
    ),
  );

  readonly previewCount = computed(() => this.previewPool().length);

  readonly pool = signal<ReturnType<PracticeService['buildQuestionPool']>>([]);
  readonly currentIndex = signal(0);
  readonly sessionResults = signal<{ correct: number; incorrect: number; needsRevision: number }>({
    correct: 0,
    incorrect: 0,
    needsRevision: 0,
  });

  readonly started = signal(false);

  readonly currentQuestion = computed(() => this.pool()[this.currentIndex()]);
  readonly sessionComplete = computed(
    () => this.pool().length > 0 && this.currentIndex() >= this.pool().length,
  );

  updateFilter(partial: Partial<PracticeFilter>): void {
    this.filter.update((current) => ({ ...current, ...partial }));
  }

  startPractice(): void {
    this.pool.set(this.previewPool());
    this.currentIndex.set(0);
    this.sessionResults.set({ correct: 0, incorrect: 0, needsRevision: 0 });
    this.started.set(true);
  }

  restart(): void {
    this.pool.set([]);
    this.currentIndex.set(0);
    this.started.set(false);
  }

  onAssessed(result: 'correct' | 'incorrect' | 'needs-revision'): void {
    const question = this.currentQuestion();
    if (!question) return;

    this.practiceService.recordAttempt(question.block.id, question.topicId, question.subjectId, result);

    this.sessionResults.update((current) => ({
      correct: current.correct + (result === 'correct' ? 1 : 0),
      incorrect: current.incorrect + (result === 'incorrect' ? 1 : 0),
      needsRevision: current.needsRevision + (result === 'needs-revision' ? 1 : 0),
    }));

    if (result !== 'correct') {
      this.revisionService.addToRevision(question.topicId);
    }

    this.currentIndex.update((i) => i + 1);
  }

  isQuestionBookmarked(questionId: string): boolean {
    return this.bookmarkService.isQuestionBookmarked(questionId);
  }

  toggleQuestionBookmark(questionId: string, topicId: string, subjectId: string): void {
    this.bookmarkService.toggleQuestionBookmark(questionId, topicId, subjectId);
  }
}
