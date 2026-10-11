import { DatePipe } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import {
  MockDifficulty,
  MockInterviewResult,
  MockLengthOption,
  MockRating,
  PracticeQuestion,
} from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { MOCK_LENGTHS, MockInterviewService } from '../../core/services/mock-interview.service';
import { PracticeService } from '../../core/services/practice.service';
import { RevisionService } from '../../core/services/revision.service';
import { CodeBlockComponent } from '../../shared/components/code-block/code-block';
import { IconComponent } from '../../shared/components/icon/icon';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { MarkdownInlinePipe } from '../../shared/pipes/markdown-inline.pipe';
import { subjectVisual } from '../../shared/subject-visuals';

type Phase = 'setup' | 'running' | 'results';

interface QuestionState {
  rating: MockRating | null;
  typedAnswer: string;
  seconds: number;
}

/** Two minutes per question — enough to think and speak an answer out loud. */
const SECONDS_PER_QUESTION = 120;

const TYPE_LABELS: Record<string, string> = {
  'output-question': 'Code output',
  'interview-question': 'Interview question',
  'tricky-question': 'Tricky question',
  'scenario-question': 'Scenario',
};

const RATING_LABELS: Record<MockRating, string> = {
  'got-it': 'Got it',
  partly: 'Partly',
  missed: 'Missed',
  skipped: 'Skipped',
};

@Component({
  selector: 'app-mock-interview',
  imports: [
    DatePipe,
    RouterLink,
    CodeBlockComponent,
    IconComponent,
    MarkdownInlinePipe,
    MarkdownPipe,
  ],
  templateUrl: './mock-interview.html',
  styleUrls: [
    './mock-interview.scss',
    './mock-interview.setup.scss',
    './mock-interview.flow.scss',
    './mock-interview.overview.scss',
    './mock-interview.session.scss',
    './mock-interview.results.scss',
  ],
})
export class MockInterviewComponent {
  private readonly contentService = inject(ContentService);
  private readonly mockService = inject(MockInterviewService);
  private readonly practiceService = inject(PracticeService);
  private readonly revisionService = inject(RevisionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lengths = MOCK_LENGTHS;
  readonly lengthEmoji: Record<string, string> = { quick: '⚡', standard: '🎯', full: '🏆' };
  readonly difficultyOptions: { id: MockDifficulty; label: string; emoji: string; hint: string }[] =
    [
      { id: 'all', label: 'Mixed', emoji: '🎲', hint: 'Every level, like a real round' },
      { id: 'beginner', label: 'Beginner', emoji: '🌱', hint: 'Core ideas and fundamentals' },
      { id: 'intermediate', label: 'Intermediate', emoji: '🌿', hint: 'Day-to-day project depth' },
      { id: 'advanced', label: 'Advanced', emoji: '🌳', hint: 'Senior-level, tricky questions' },
    ];
  readonly typeLabels = TYPE_LABELS;
  readonly ratingLabels = RATING_LABELS;
  readonly visual = subjectVisual;

  readonly phase = signal<Phase>('setup');

  /** The setup screen has two tabs: building a new interview, and looking back at past ones. */
  readonly activeTab = signal<'new' | 'results'>('new');

  // ── Setup ──────────────────────────────────────────────────────────────
  readonly selectedSubjectId = signal<string | null>(null);
  readonly selectedLength = signal<MockLengthOption>(MOCK_LENGTHS[1]);
  readonly selectedDifficulty = signal<MockDifficulty>('all');

  /** Every subject with its topics loaded, so setup can show real question counts. */
  readonly subjectsWithTopics = toSignal(
    this.contentService.getSubjects().pipe(
      switchMap((subjects) =>
        subjects.length === 0
          ? of([])
          : forkJoin(
              subjects.map((subject) =>
                this.contentService.getSubjectTopics(subject.id).pipe(
                  map((topics) => ({
                    subject,
                    topics,
                    questionCount: this.mockService.countQuestions(topics),
                  })),
                ),
              ),
            ),
      ),
    ),
    { initialValue: null },
  );

  readonly selectedEntry = computed(
    () => this.subjectsWithTopics()?.find((e) => e.subject.id === this.selectedSubjectId()) ?? null,
  );

  /** How many questions the chosen subject has at each level, so empty levels can be disabled. */
  readonly levelCounts = computed<Record<MockDifficulty, number> | null>(() => {
    const entry = this.selectedEntry();
    if (!entry) return null;
    const count = (level: MockDifficulty) => this.mockService.countQuestions(entry.topics, level);
    return {
      all: count('all'),
      beginner: count('beginner'),
      intermediate: count('intermediate'),
      advanced: count('advanced'),
    };
  });

  /** Questions the chosen subject has at the chosen level. */
  readonly availableQuestions = computed(() => {
    const entry = this.selectedEntry();
    return entry ? this.mockService.countQuestions(entry.topics, this.selectedDifficulty()) : 0;
  });

  /** A session can't be longer than the number of questions available. */
  readonly plannedQuestions = computed(() =>
    Math.min(this.selectedLength().questions, this.availableQuestions()),
  );
  readonly plannedMinutes = computed(() =>
    Math.round((this.plannedQuestions() * SECONDS_PER_QUESTION) / 60),
  );

  readonly allResults = this.mockService.results;

  /** Subjects with everything a card needs: best score, last attempt and a friendly status. */
  readonly subjectCards = computed(() =>
    (this.subjectsWithTopics() ?? []).map((entry) => {
      const mine = this.allResults().filter((r) => r.subjectId === entry.subject.id);
      const best = mine.length ? Math.max(...mine.map((r) => r.score)) : null;
      const status: 'new' | 'practice' | 'improving' | 'strong' =
        best === null ? 'new' : best < 60 ? 'practice' : best >= 85 ? 'strong' : 'improving';
      return {
        entry,
        best,
        attempts: mine.length,
        lastAt: mine[0]?.finishedAt ?? null,
        status,
      };
    }),
  );

  readonly statusLabels = {
    new: 'New',
    practice: 'Needs practice',
    improving: 'Getting there',
    strong: 'Strong',
  } as const;

  /** A gentle nudge: the weakest subject you have tried, otherwise one you have not tried yet. */
  readonly recommendation = computed(() => {
    const cards = this.subjectCards().filter((c) => c.entry.questionCount > 0);
    if (cards.length === 0) return null;
    const tried = cards.filter((c) => c.best !== null);
    const weakest = [...tried].sort((a, b) => (a.best ?? 0) - (b.best ?? 0))[0];
    if (weakest && (weakest.best ?? 100) < 80) {
      return {
        subjectId: weakest.entry.subject.id,
        title: weakest.entry.subject.title,
        text: `You scored ${weakest.best}% here. One more round could lift it.`,
      };
    }
    const fresh = cards.find((c) => c.best === null);
    if (fresh) {
      return {
        subjectId: fresh.entry.subject.id,
        title: fresh.entry.subject.title,
        text: tried.length ? "You haven't tried this one yet." : 'A great place to start.',
      };
    }
    return null;
  });

  /** Results tab: filter the history by subject. */
  readonly resultsFilter = signal<string>('all');
  readonly filteredResults = computed(() =>
    this.resultsFilter() === 'all'
      ? this.allResults()
      : this.allResults().filter((r) => r.subjectId === this.resultsFilter()),
  );
  readonly subjectsWithResults = computed(() => {
    const ids = new Set(this.allResults().map((r) => r.subjectId));
    return (this.subjectsWithTopics() ?? []).map((e) => e.subject).filter((s) => ids.has(s.id));
  });

  setResultsFilter(id: string): void {
    this.resultsFilter.set(id);
  }

  durationText(seconds: number): string {
    return this.formatSeconds(seconds);
  }
  readonly showAllHistory = signal(false);
  readonly visibleHistory = computed(() =>
    this.showAllHistory() ? this.allResults() : this.allResults().slice(0, 3),
  );
  readonly stats = computed(() => this.mockService.summarize(this.allResults()));

  /** Last 10 scores, oldest to newest, for the little trend chart. */
  readonly trend = computed(() =>
    this.allResults()
      .slice(0, 10)
      .reverse()
      .map((r) => ({
        id: r.id,
        score: r.score,
        tone: this.mockService.gradeFor(r.score).tone,
        label: `${this.subjectTitle(r.subjectId)}, ${r.score}%`,
        emoji: subjectVisual(r.subjectId).emoji,
      })),
  );

  toneFor(score: number): 'great' | 'good' | 'ok' | 'low' {
    return this.mockService.gradeFor(score).tone;
  }

  /** Tiles are narrow, so long names drop a leading "Frontend" (the full name stays in the tooltip). */
  shortName(title: string): string {
    return title.replace(/^Frontend\s+/i, '');
  }

  bestScore(subjectId: string): number | null {
    return this.mockService.bestScoreFor(subjectId);
  }

  subjectTitle(subjectId: string): string {
    return (
      this.subjectsWithTopics()?.find((e) => e.subject.id === subjectId)?.subject.title ?? subjectId
    );
  }

  // ── Running ────────────────────────────────────────────────────────────
  readonly questions = signal<PracticeQuestion[]>([]);
  readonly states = signal<QuestionState[]>([]);
  readonly currentIndex = signal(0);
  readonly answerRevealed = signal(false);
  readonly confirmingFinish = signal(false);
  readonly timeLimit = signal(0);
  readonly timeLeft = signal(0);

  private timerId: ReturnType<typeof setInterval> | null = null;
  private questionStartedAt = 0;
  private sessionStartedAt = 0;
  private sessionSubjectId = '';

  readonly current = computed(() => this.questions()[this.currentIndex()]);
  readonly currentState = computed(() => this.states()[this.currentIndex()]);

  readonly answeredCount = computed(
    () => this.states().filter((s) => s.rating !== null && s.rating !== 'skipped').length,
  );
  readonly progressPercent = computed(() => {
    const total = this.questions().length;
    return total === 0 ? 0 : Math.round((this.answeredCount() / total) * 100);
  });

  readonly clock = computed(() => this.formatSeconds(Math.max(0, this.timeLeft())));

  /** calm → hurry → urgent, so time pressure is felt without reading the numbers. */
  readonly timerTone = computed<'calm' | 'hurry' | 'urgent'>(() => {
    const limit = this.timeLimit();
    if (limit === 0) return 'calm';
    const ratio = this.timeLeft() / limit;
    return ratio <= 0.1 ? 'urgent' : ratio <= 0.25 ? 'hurry' : 'calm';
  });
  readonly timerPercent = computed(() => {
    const limit = this.timeLimit();
    return limit === 0 ? 0 : Math.max(0, Math.round((this.timeLeft() / limit) * 100));
  });

  readonly unfinishedCount = computed(
    () => this.states().filter((s) => s.rating === null || s.rating === 'skipped').length,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  selectSubject(subjectId: string): void {
    this.selectedSubjectId.set(subjectId);
    // The new subject may have no questions at the chosen level; fall back to Mixed.
    const counts = this.levelCounts();
    if (counts && counts[this.selectedDifficulty()] === 0) {
      this.selectedDifficulty.set('all');
    }
  }

  setTab(tab: 'new' | 'results'): void {
    this.activeTab.set(tab);
  }

  selectDifficulty(level: MockDifficulty): void {
    this.selectedDifficulty.set(level);
  }

  selectLength(option: MockLengthOption): void {
    this.selectedLength.set(option);
  }

  start(): void {
    const entry = this.selectedEntry();
    if (!entry) return;
    this.begin(
      entry.subject.id,
      this.mockService.buildSession(
        entry.topics,
        this.selectedLength().questions,
        this.selectedDifficulty(),
      ),
    );
  }

  /** Re-run only the questions that weren't a clean "Got it". */
  retryMissed(): void {
    const again = this.reviewItems()
      .filter((item) => item.rating !== 'got-it')
      .map((item) => item.question);
    if (again.length > 0) this.begin(this.sessionSubjectId, again);
  }

  private begin(subjectId: string, questions: PracticeQuestion[]): void {
    this.sessionSubjectId = subjectId;
    this.questions.set(questions);
    this.states.set(questions.map(() => ({ rating: null, typedAnswer: '', seconds: 0 })));
    this.currentIndex.set(0);
    this.answerRevealed.set(false);
    this.confirmingFinish.set(false);
    const limit = questions.length * SECONDS_PER_QUESTION;
    this.timeLimit.set(limit);
    this.timeLeft.set(limit);
    this.sessionStartedAt = Date.now();
    this.questionStartedAt = Date.now();
    this.phase.set('running');
    this.startTimer();
    window.scrollTo({ top: 0 });
  }

  updateTypedAnswer(value: string): void {
    this.patchCurrent({ typedAnswer: value });
  }

  revealAnswer(): void {
    this.answerRevealed.set(true);
  }

  rate(rating: 'got-it' | 'partly' | 'missed'): void {
    if (this.phase() !== 'running' || !this.answerRevealed()) return;
    this.commitCurrent(rating);
    this.goToNextOpen();
  }

  skip(): void {
    if (this.phase() !== 'running') return;
    this.commitCurrent('skipped');
    this.goToNextOpen();
  }

  jumpTo(index: number): void {
    if (this.phase() !== 'running' || index === this.currentIndex()) return;
    const target = this.states()[index];
    // Rated questions are locked in; only open or skipped ones can be revisited.
    if (target.rating !== null && target.rating !== 'skipped') return;
    this.captureTime();
    this.currentIndex.set(index);
    this.answerRevealed.set(false);
  }

  askFinish(): void {
    this.confirmingFinish.set(true);
  }

  cancelFinish(): void {
    this.confirmingFinish.set(false);
  }

  finish(timedOut = false): void {
    if (this.phase() !== 'running') return;
    this.captureTime();
    this.stopTimer();

    const questions = this.questions();
    const states = this.states();
    // Anything still unanswered counts as skipped.
    const ratings: MockRating[] = states.map((s) => s.rating ?? 'skipped');

    questions.forEach((question, i) => {
      const rating = ratings[i];
      if (rating !== 'got-it') this.revisionService.addToRevision(question.topicId);
      if (rating === 'skipped') return;
      this.practiceService.recordAttempt(
        question.block.id,
        question.topicId,
        question.subjectId,
        rating === 'got-it' ? 'correct' : rating === 'partly' ? 'needs-revision' : 'incorrect',
        states[i].seconds,
      );
    });

    const count = (r: MockRating) => ratings.filter((x) => x === r).length;
    this.previousBest.set(this.mockService.bestScoreFor(this.sessionSubjectId));
    this.previousScore.set(this.mockService.lastScoreFor(this.sessionSubjectId));
    this.reopened.set(false);
    this.result.set(
      this.mockService.save({
        subjectId: this.sessionSubjectId,
        finishedAt: new Date().toISOString(),
        totalQuestions: questions.length,
        gotIt: count('got-it'),
        partly: count('partly'),
        missed: count('missed'),
        skipped: count('skipped'),
        score: this.mockService.calculateScore(ratings),
        durationSeconds: Math.min(
          this.timeLimit(),
          Math.round((Date.now() - this.sessionStartedAt) / 1000),
        ),
        timeLimitSeconds: this.timeLimit(),
        timedOut,
        items: questions.map((q, i) => ({
          questionId: q.block.id,
          topicId: q.topicId,
          rating: ratings[i],
          typedAnswer: states[i].typedAnswer,
        })),
      }),
    );
    this.finalRatings.set(ratings);
    this.confirmingFinish.set(false);
    this.phase.set('results');
    window.scrollTo({ top: 0 });
  }

  // ── Results ────────────────────────────────────────────────────────────
  readonly result = signal<MockInterviewResult | null>(null);
  readonly previousBest = signal<number | null>(null);
  /** Score of the interview before this one on the same subject, for the "vs last time" line. */
  readonly previousScore = signal<number | null>(null);
  /** True when the scorecard on screen is a saved one opened from the history list. */
  readonly reopened = signal(false);

  readonly changeVsLast = computed(() => {
    const result = this.result();
    const previous = this.previousScore();
    return result && previous !== null ? result.score - previous : null;
  });
  private readonly finalRatings = signal<MockRating[]>([]);

  readonly grade = computed(() => this.mockService.gradeFor(this.result()?.score ?? 0));

  readonly isNewBest = computed(() => {
    const result = this.result();
    const best = this.previousBest();
    return !!result && best !== null && result.score > best;
  });

  readonly segments = computed<{ label: string; value: number; color: string }[]>(() => {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'Got it', value: r.gotIt, color: 'var(--color-success)' },
      { label: 'Partly', value: r.partly, color: 'var(--color-warning)' },
      { label: 'Missed', value: r.missed, color: 'var(--color-danger)' },
      { label: 'Skipped', value: r.skipped, color: 'var(--color-text-muted)' },
    ];
  });

  readonly gradeEmoji = computed(
    () => ({ great: '🏆', good: '🎉', ok: '💪', low: '📚' })[this.grade().tone],
  );

  /** Conic-gradient ring: one arc per outcome, sized by how many questions fell into it. */
  readonly ringGradient = computed(() => {
    const segments = this.segments().filter((s) => s.value > 0);
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return 'var(--color-surface-alt)';
    let cursor = 0;
    const stops = segments.map((s) => {
      const start = (cursor / total) * 100;
      cursor += s.value;
      return `${s.color} ${start}% ${(cursor / total) * 100}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  readonly reviewItems = computed(() => {
    const ratings = this.finalRatings();
    const states = this.states();
    return this.questions().map((question, i) => ({
      question,
      rating: ratings[i] ?? ('skipped' as MockRating),
      typedAnswer: states[i]?.typedAnswer ?? '',
    }));
  });

  /** Topics where the user lost points, worst first — the "study this next" list. */
  readonly weakTopics = computed(() => {
    const byTopic = new Map<
      string,
      { topicId: string; subjectId: string; title: string; lost: number }
    >();
    for (const item of this.reviewItems()) {
      const lost = item.rating === 'got-it' ? 0 : item.rating === 'partly' ? 0.5 : 1;
      if (lost === 0) continue;
      const q = item.question;
      const entry = byTopic.get(q.topicId) ?? {
        topicId: q.topicId,
        subjectId: q.subjectId,
        title: q.topicTitle,
        lost: 0,
      };
      entry.lost += lost;
      byTopic.set(q.topicId, entry);
    }
    return [...byTopic.values()].sort((a, b) => b.lost - a.lost).slice(0, 5);
  });

  readonly needsRetry = computed(() => this.reviewItems().some((i) => i.rating !== 'got-it'));

  readonly durationLabel = computed(() => this.formatSeconds(this.result()?.durationSeconds ?? 0));
  readonly averageLabel = computed(() => {
    const r = this.result();
    const answered = r ? r.gotIt + r.partly + r.missed : 0;
    return r && answered > 0 ? this.formatSeconds(Math.round(r.durationSeconds / answered)) : '—';
  });

  /** Content titles such as "Tricky question" only repeat the type chip, so hide them. */
  isGenericTitle(title: string): boolean {
    return /question$/i.test(title.trim());
  }

  /** Reopens the full scorecard and answer review of a saved interview. */
  openSaved(saved: MockInterviewResult): void {
    const entry = this.subjectsWithTopics()?.find((e) => e.subject.id === saved.subjectId);
    const found: { question: PracticeQuestion; rating: MockRating; typedAnswer: string }[] = [];
    for (const item of saved.items ?? []) {
      const topic = entry?.topics.find((t) => t.id === item.topicId);
      const block = topic?.blocks.find((b) => b.id === item.questionId);
      if (!topic || !block || !('question' in block)) continue; // content may have changed since
      found.push({
        question: {
          block,
          topicId: topic.id,
          topicTitle: topic.title,
          subjectId: topic.subjectId,
          difficulty: topic.difficulty,
        },
        rating: item.rating,
        typedAnswer: item.typedAnswer ?? '',
      });
    }

    this.sessionSubjectId = saved.subjectId;
    this.selectedSubjectId.set(saved.subjectId);
    this.questions.set(found.map((f) => f.question));
    this.states.set(
      found.map((f) => ({ rating: f.rating, typedAnswer: f.typedAnswer, seconds: 0 })),
    );
    this.finalRatings.set(found.map((f) => f.rating));
    this.result.set(saved);
    this.previousBest.set(null);
    this.previousScore.set(null);
    this.reopened.set(true);
    this.phase.set('results');
    window.scrollTo({ top: 0 });
  }

  toggleHistory(): void {
    this.showAllHistory.update((open) => !open);
  }

  /** From a scorecard, return to the list of past interviews. */
  backToResults(): void {
    this.activeTab.set('results');
    this.phase.set('setup');
    window.scrollTo({ top: 0 });
  }

  backToSetup(): void {
    this.activeTab.set('new');
    this.phase.set('setup');
    window.scrollTo({ top: 0 });
  }

  formatSeconds(total: number): string {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** Used by the route guard: a running interview is never dropped silently. */
  canLeave(): boolean {
    return (
      this.phase() !== 'running' ||
      window.confirm('Leave the mock interview? Your answers so far will be lost.')
    );
  }

  /** Warns before a reload or tab close while an interview is running. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.phase() === 'running') event.preventDefault();
  }

  /** Keys 1 / 2 / 3 rate the answer once it is showing — faster than the mouse. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.phase() !== 'running' || !this.answerRevealed()) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '1') this.rate('got-it');
    else if (event.key === '2') this.rate('partly');
    else if (event.key === '3') this.rate('missed');
  }

  // ── Internals ──────────────────────────────────────────────────────────
  private patchCurrent(patch: Partial<QuestionState>): void {
    const index = this.currentIndex();
    this.states.update((all) => all.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  /** Adds the time spent on the current question since it was last shown. */
  private captureTime(): void {
    const spent = Math.round((Date.now() - this.questionStartedAt) / 1000);
    const state = this.currentState();
    if (state) this.patchCurrent({ seconds: state.seconds + spent });
    this.questionStartedAt = Date.now();
  }

  private commitCurrent(rating: MockRating): void {
    this.captureTime();
    this.patchCurrent({ rating });
  }

  /**
   * Moves to the next question still open, then to skipped ones, so skipped
   * questions come back at the end. Finishes when nothing is left.
   */
  private goToNextOpen(): void {
    const states = this.states();
    const total = states.length;
    const from = this.currentIndex();
    const passes: ((s: QuestionState) => boolean)[] = [
      (s) => s.rating === null,
      (s) => s.rating === 'skipped',
    ];

    for (const matches of passes) {
      for (let step = 1; step < total; step++) {
        const index = (from + step) % total;
        if (matches(states[index])) {
          this.currentIndex.set(index);
          this.answerRevealed.set(false);
          this.questionStartedAt = Date.now();
          return;
        }
      }
    }

    // Only the current question is left. If it was just skipped the user can
    // still answer it; otherwise the interview is done.
    if (states[from].rating === 'skipped') {
      this.answerRevealed.set(false);
      return;
    }
    this.finish();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerId = setInterval(() => {
      const left = this.timeLimit() - Math.round((Date.now() - this.sessionStartedAt) / 1000);
      this.timeLeft.set(Math.max(0, left));
      if (left <= 0) this.finish(true);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
