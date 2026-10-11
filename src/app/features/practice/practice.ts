import {
  afterRenderEffect,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  defaultIfEmpty,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { BookmarkService } from '../../core/services/bookmark.service';
import { PracticeService } from '../../core/services/practice.service';
import { RevisionService } from '../../core/services/revision.service';
import { SettingsService } from '../../core/services/settings.service';
import { PracticeFilter, PracticeQuestion } from '../../core/models/filters.models';
import { Subject, Topic } from '../../core/models';
import { difficultyFrom, questionTypeFrom } from '../../shared/question-bank';
import { QuestionCardComponent } from '../../shared/components/question-card/question-card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { SelectComponent } from '../../shared/components/select/select';
import { SelectOption } from '../../shared/components/select/select.models';
import { hasInAppHistory } from '../../shared/navigation';

@Component({
  selector: 'app-practice',
  imports: [RouterLink, QuestionCardComponent, EmptyStateComponent, IconComponent, SelectComponent],
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
  questionId = input<string>();
  questionType = input<string>();
  categoryId = input<string>();
  difficulty = input<string>();
  searchTerm = input<string>();
  from = input<string>();

  readonly cameFromTopic = computed(() => !!this.subjectId() && !!this.topicId());

  readonly reloadContent = signal(0);
  readonly subjectCatalog = toSignal(
    toObservable(this.reloadContent).pipe(
      switchMap(() =>
        this.contentService.getSubjects().pipe(
          map((subjects) => ({ subjects, loading: false, error: false })),
          startWith({ subjects: [] as Subject[], loading: true, error: false }),
          catchError(() => of({ subjects: [] as Subject[], loading: false, error: true })),
        ),
      ),
    ),
    { initialValue: { subjects: [] as Subject[], loading: true, error: false } },
  );
  readonly subjects = computed(() => this.subjectCatalog().subjects);

  readonly filter = signal<PracticeFilter>({
    difficulty: this.settingsService.settings().defaultDifficulty,
    questionType: 'all',
    onlyBookmarked: false,
    onlyWeak: false,
    random: true,
  });

  private seededRoute = '';
  readonly sessionHeading = viewChild<ElementRef<HTMLElement>>('sessionHeading');
  private focusedStep = '';

  constructor() {
    afterRenderEffect(() => {
      const step = `${this.started()}:${this.currentIndex()}:${this.sessionComplete()}`;
      const heading = this.sessionHeading();
      if (step !== this.focusedStep && heading) heading.nativeElement.focus();
      this.focusedStep = step;
    });
    effect(() => {
      const subjectId = this.subjectId();
      const topicId = this.topicId();
      const questionId = this.questionId();
      const questionType = this.questionType();
      const categoryId = this.categoryId();
      const difficulty = this.difficulty();
      const searchTerm = this.searchTerm();
      const signature = JSON.stringify([
        subjectId,
        topicId,
        questionId,
        questionType,
        categoryId,
        difficulty,
        searchTerm,
      ]);
      // Only incoming URL changes seed the filters; clearing a lock stays cleared.
      if (signature === this.seededRoute) return;
      const firstSeed = this.seededRoute === '';
      this.seededRoute = signature;
      if (
        firstSeed &&
        ![subjectId, topicId, questionId, questionType, categoryId, difficulty, searchTerm].some(
          Boolean,
        )
      )
        return;
      this.filter.update((current) => ({
        ...current,
        subjectId,
        topicId,
        questionId,
        categoryId,
        searchTerm,
        onlyBookmarked: false,
        onlyWeak: false,
        questionType: questionTypeFrom(questionType),
        difficulty: difficultyFrom(difficulty),
      }));
      this.restartSession();
    });
  }

  readonly selectedSubjectCategories = computed(() => {
    const subject = this.subjects().find((s) => s.id === this.filter().subjectId);
    return subject?.categories ?? [];
  });

  readonly subjectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All Subjects' },
    ...this.subjects().map((s) => ({ value: s.id, label: s.title })),
  ]);

  readonly categoryOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All Categories' },
    ...this.selectedSubjectCategories().map((c) => ({ value: c.id, label: c.title })),
  ]);

  readonly difficultyOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  readonly questionTypeOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    { value: 'output-question', label: 'Code Output' },
    { value: 'interview-question', label: 'Interview Question' },
    { value: 'tricky-question', label: 'Tricky Question' },
    { value: 'scenario-question', label: 'Scenario Question' },
  ];

  readonly availableContent = toSignal(
    combineLatest([
      toObservable(this.filter),
      toObservable(this.subjectCatalog),
      toObservable(this.reloadContent),
    ]).pipe(
      map(([filter, catalog, reload]) => ({
        ids: filter.subjectId ? [filter.subjectId] : catalog.subjects.map((s) => s.id),
        reload,
        loading: catalog.loading,
        error: catalog.error,
      })),
      distinctUntilChanged(
        (a, b) =>
          a.ids.join('|') === b.ids.join('|') &&
          a.reload === b.reload &&
          a.loading === b.loading &&
          a.error === b.error,
      ),
      switchMap(({ ids, loading, error }) =>
        loading || error || ids.length === 0
          ? of({ topics: [] as Topic[], loading, error })
          : forkJoin(
              ids.map((id) =>
                this.contentService.getSubjectTopics(id).pipe(defaultIfEmpty([] as Topic[])),
              ),
            ).pipe(
              map((lists) => ({ topics: lists.flat(), loading: false, error: false })),
              startWith({ topics: [] as Topic[], loading: true, error: false }),
              catchError(() => of({ topics: [] as Topic[], loading: false, error: true })),
            ),
      ),
    ),
    { initialValue: { topics: [] as Topic[], loading: true, error: false } },
  );
  private readonly availableTopics = computed(() => this.availableContent().topics);

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
      { ...this.filter(), random: false },
      this.bookmarkService.bookmarkedQuestionIds(),
      this.weakTopicIds(),
    ),
  );

  readonly previewCount = computed(() => this.previewPool().length);
  readonly sessionLength = signal(10);
  readonly plannedCount = computed(() =>
    this.sessionLength() === 0
      ? this.previewCount()
      : Math.min(this.sessionLength(), this.previewCount()),
  );
  readonly lengthOptions: SelectOption[] = [
    { value: '5', label: '5 questions' },
    { value: '10', label: '10 questions' },
    { value: '20', label: '20 questions' },
    { value: '0', label: 'All matching questions' },
  ];
  readonly reviews = signal<
    { question: PracticeQuestion; result: 'correct' | 'incorrect' | 'needs-revision' | 'skipped' }[]
  >([]);
  readonly missedQuestions = computed(() =>
    this.reviews()
      .filter((item) => item.result !== 'correct')
      .map((item) => item.question),
  );
  readonly skippedCount = computed(
    () => this.reviews().filter((item) => item.result === 'skipped').length,
  );

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
    } else if (this.from() === 'tricky' && this.subjectId()) {
      this.returnToQuestionBank();
    } else if (this.cameFromTopic()) {
      this.router.navigate(['/subjects', this.subjectId(), 'topics', this.topicId()]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  returnToTopic(): void {
    this.router.navigate(['/subjects', this.subjectId(), 'topics', this.topicId()]);
  }

  returnToQuestionBank(): void {
    this.router.navigate(['/subjects', this.subjectId()], {
      queryParams: {
        view: 'tricky',
        q: this.searchTerm(),
        category: this.categoryId(),
        difficulty: this.difficulty(),
      },
    });
  }

  setSessionLength(value: string): void {
    const length = Number(value);
    if ([0, 5, 10, 20].includes(length)) this.sessionLength.set(length);
  }

  setQuestionPreset(tricky: boolean): void {
    this.updateFilter({
      questionType: tricky ? 'tricky-question' : 'all',
      questionId: undefined,
      topicId: undefined,
    });
  }

  updateFilter(partial: Partial<PracticeFilter>): void {
    this.filter.update((current) => {
      const next = { ...current, ...partial };
      // Changing subject or category must clear a deep-linked topic lock,
      // otherwise the pool stays silently stuck on one topic.
      if (('subjectId' in partial || 'categoryId' in partial) && !('topicId' in partial)) {
        next.topicId = undefined;
      }
      if (
        ['subjectId', 'categoryId', 'topicId', 'questionType', 'difficulty'].some(
          (key) => key in partial,
        ) &&
        !('questionId' in partial)
      ) {
        next.questionId = undefined;
      }
      return next;
    });
  }

  clearTopicLock(): void {
    this.filter.update((current) => ({ ...current, topicId: undefined, questionId: undefined }));
  }

  startPractice(): void {
    if (
      this.availableContent().loading ||
      this.availableContent().error ||
      this.previewCount() === 0
    )
      return;
    const questions = this.practiceService.buildQuestionPool(
      this.availableTopics(),
      this.filter(),
      this.bookmarkService.bookmarkedQuestionIds(),
      this.weakTopicIds(),
    );
    this.beginSession(questions.slice(0, this.plannedCount()));
  }

  private beginSession(questions: PracticeQuestion[]): void {
    this.pool.set(questions);
    this.currentIndex.set(0);
    this.sessionResults.set({ correct: 0, incorrect: 0, needsRevision: 0 });
    this.reviews.set([]);
    this.started.set(true);
  }

  private restartSession(): void {
    this.pool.set([]);
    this.currentIndex.set(0);
    this.started.set(false);
    this.reviews.set([]);
  }

  restart(): void {
    this.restartSession();
  }

  retryMissed(): void {
    const questions = this.missedQuestions();
    if (questions.length) this.beginSession(questions);
  }

  skipQuestion(): void {
    const question = this.currentQuestion();
    if (!question) return;
    this.reviews.update((items) => [...items, { question, result: 'skipped' }]);
    this.currentIndex.update((index) => index + 1);
  }

  finishSession(): void {
    const unanswered = this.pool().slice(this.currentIndex());
    this.reviews.update((items) => [
      ...items,
      ...unanswered.map((question) => ({ question, result: 'skipped' as const })),
    ]);
    this.currentIndex.set(this.pool().length);
  }

  onAssessed(result: 'correct' | 'incorrect' | 'needs-revision'): void {
    const question = this.currentQuestion();
    if (!question) return;

    this.practiceService.recordAttempt(
      question.block.id,
      question.topicId,
      question.subjectId,
      result,
    );
    this.reviews.update((items) => [...items, { question, result }]);

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
