import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
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
import { hasInAppHistory } from '../../shared/navigation';

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
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly settings = this.settingsService.settings;

  subjectId = input<string>();
  topicId = input<string>();

  readonly cameFromTopic = computed(() => !!this.subjectId() && !!this.topicId());

  readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly filter = signal<PracticeFilter>({
    difficulty: this.settingsService.settings().defaultDifficulty,
    questionType: 'all',
    onlyBookmarked: false,
    onlyWeak: false,
    random: true,
  });

  /** True after route query params have been seeded into the filter once. */
  private seededFromRoute = false;

  constructor() {
    effect(() => {
      const subjectId = this.subjectId();
      const topicId = this.topicId();
      // Seed once from deep-link params so clearing the topic lock sticks
      // even while the URL still carries ?topicId=.
      if (this.seededFromRoute || (!subjectId && !topicId)) return;
      this.seededFromRoute = true;
      this.filter.update((current) => ({
        ...current,
        subjectId: subjectId ?? current.subjectId,
        topicId: topicId ?? current.topicId,
      }));
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

  readonly lockedTopicTitle = computed(() => {
    const topicId = this.filter().topicId;
    if (!topicId) return null;
    return this.availableTopics().find((t) => t.id === topicId)?.title ?? topicId;
  });

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

  goBack(): void {
    if (hasInAppHistory()) {
      this.location.back();
    } else if (this.cameFromTopic()) {
      this.router.navigate(['/subjects', this.subjectId(), 'topics', this.topicId()]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  updateFilter(partial: Partial<PracticeFilter>): void {
    this.filter.update((current) => {
      const next = { ...current, ...partial };
      // Changing subject or category must clear a deep-linked topic lock,
      // otherwise the pool stays silently stuck on one topic.
      if (('subjectId' in partial || 'categoryId' in partial) && !('topicId' in partial)) {
        next.topicId = undefined;
      }
      return next;
    });
  }

  clearTopicLock(): void {
    this.filter.update((current) => ({ ...current, topicId: undefined }));
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
    // Drop the topic lock so "Start New Session" returns to open filters.
    this.clearTopicLock();
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
