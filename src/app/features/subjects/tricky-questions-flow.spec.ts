import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject as Stream, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, Subject, Topic } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ContentService } from '../../core/services/content.service';
import { MetricsService } from '../../core/services/metrics.service';
import { PracticeService } from '../../core/services/practice.service';
import { ProgressStore } from '../../core/services/progress.store';
import { RevisionService } from '../../core/services/revision.service';
import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/storage/storage.service';
import { PracticeComponent } from '../practice/practice';
import { SubjectDetailComponent } from './subject-detail';

const topics: Topic[] = ['signals', 'streams'].map((id, index) => ({
  id,
  subjectId: 'angular',
  categoryId: index ? 'async' : 'state',
  title: id,
  description: '',
  difficulty: index ? 'advanced' : 'beginner',
  interviewPriority: 'high',
  tags: [id],
  blocks: Array.from({ length: 6 }, (_, n) => ({
    id: `${id}-${n}`,
    type: 'tricky-question' as const,
    order: n + 1,
    title: `${id} trap ${n}`,
    question: `Explain ${id} trap ${n}?`,
    answer: 'Answer kept hidden',
    explanation: 'Explanation kept hidden',
    hints: ['Consider the lifetime'],
  })),
}));
const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: topics.map((topic, i) => ({
    id: topic.categoryId,
    subjectId: 'angular',
    title: topic.categoryId,
    order: i,
    topics: [topic],
  })),
};

describe('Tricky questions learning flow', () => {
  const getSubjectTopics = vi.fn(() => of(topics));
  const getSubjects = vi.fn(() => of([subject]));
  const addToRevision = vi.fn();

  beforeEach(() => {
    getSubjectTopics.mockReset().mockReturnValue(of(topics));
    getSubjects.mockReset().mockReturnValue(of([subject]));
    addToRevision.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'subjects/:subjectId', component: SubjectDetailComponent },
            { path: 'practice', component: PracticeComponent },
          ],
          withComponentInputBinding(),
        ),
        {
          provide: ContentService,
          useValue: { getSubjects, getSubject: () => of(subject), getSubjectTopics },
        },
        {
          provide: StorageService,
          useValue: { get: (_key: string, fallback: unknown) => fallback, set: vi.fn() },
        },
        {
          provide: SettingsService,
          useValue: { settings: signal({ ...DEFAULT_SETTINGS, showAnswersAutomatically: false }) },
        },
        {
          provide: ProgressStore,
          useValue: { progress: signal({}), lowConfidenceTopicIds: signal([]) },
        },
        { provide: RevisionService, useValue: { revisionTopicIds: signal([]), addToRevision } },
        {
          provide: MetricsService,
          useValue: { computeSubjectMetrics: () => ({ completed: 0, total: 2, percentage: 0 }) },
        },
      ],
    });
  });

  function button(harness: RouterTestingHarness, label: string): HTMLButtonElement {
    const found = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    );
    expect(found, label).toBeDefined();
    return found!;
  }

  function link(harness: RouterTestingHarness, label: string): HTMLAnchorElement {
    const found = Array.from(harness.routeNativeElement!.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === label,
    );
    expect(found, label).toBeDefined();
    return found!;
  }

  it('renders a paginated bank with concealed answers and correct shared bookmark IDs', async () => {
    const h = await RouterTestingHarness.create('/subjects/angular?view=tricky');
    expect(h.routeNativeElement!.querySelectorAll('app-question-card')).toHaveLength(10);
    expect(h.routeNativeElement!.textContent).not.toContain('Answer kept hidden');
    expect(h.routeNativeElement!.textContent).toContain('0 / 2 topics');
    (h.routeNativeElement!.querySelector('.bookmark-button') as HTMLButtonElement).click();
    expect(TestBed.inject(BookmarkService).bookmarkedQuestionIds().has('signals-0')).toBe(true);
    button(h, 'Next').click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/subjects/angular?view=tricky&page=2');
    expect(h.routeNativeElement!.querySelectorAll('app-question-card')).toHaveLength(2);
    expect(button(h, 'Next').disabled).toBe(true);
    await h.navigateByUrl('/subjects/angular?view=tricky&page=999');
    expect(h.routeNativeElement!.textContent).toContain('Page 2 of 2');
  });

  it('carries the filtered bank to Practice and bounds the session without repeats', async () => {
    const h = await RouterTestingHarness.create(
      '/subjects/angular?view=tricky&q=streams&category=async&difficulty=advanced',
    );
    expect(h.routeNativeElement!.querySelectorAll('app-question-card')).toHaveLength(6);
    const href = link(h, 'Practice this set').getAttribute('href')!;
    const practice = await h.navigateByUrl(href, PracticeComponent);
    expect(practice.filter()).toMatchObject({
      subjectId: 'angular',
      questionType: 'tricky-question',
      categoryId: 'async',
      searchTerm: 'streams',
      difficulty: 'advanced',
    });
    expect(practice.previewCount()).toBe(6);
    practice.setSessionLength('5');
    button(h, 'Start practice').click();
    h.detectChanges();
    expect(practice.pool()).toHaveLength(5);
    expect(new Set(practice.pool().map((q) => q.block.id)).size).toBe(5);
    expect(practice.pool().every((q) => q.topicId === 'streams')).toBe(true);
    expect(h.routeNativeElement!.textContent).not.toContain('Answer kept hidden');
    expect(h.routeNativeElement!.querySelector('.question-card__self-assess')).toBeNull();
    button(h, 'Show Answer').click();
    h.detectChanges();
    expect(h.routeNativeElement!.textContent).toContain('Answer kept hidden');
    button(h, 'Incorrect').click();
    h.detectChanges();
    expect(practice.currentIndex()).toBe(1);
    expect(h.routeNativeElement!.textContent).not.toContain('Answer kept hidden');
    expect(addToRevision).toHaveBeenCalledWith('streams');
    button(h, 'Show Answer').click();
    h.detectChanges();
    button(h, 'Correct').click();
    h.detectChanges();
    button(h, 'Skip question').click();
    h.detectChanges();
    button(h, 'Finish and review').click();
    h.detectChanges();
    expect(practice.skippedCount()).toBe(3);
    expect(TestBed.inject(PracticeService).history()).toHaveLength(2);
    expect(practice.reviews()).toHaveLength(5);
    const correctId = practice.reviews().find((item) => item.result === 'correct')!.question.block
      .id;
    button(h, 'Retry missed and skipped (4)').click();
    h.detectChanges();
    expect(practice.pool()).toHaveLength(4);
    expect(practice.pool().some((q) => q.block.id === correctId)).toBe(false);
    expect(practice.reviews()).toHaveLength(0);
    expect(practice.currentIndex()).toBe(0);
    expect(h.routeNativeElement!.textContent).not.toContain('Answer kept hidden');
  });

  it('practises the exact linked question, keeps its bookmark, and clears the lock on a filter change', async () => {
    const h = await RouterTestingHarness.create('/subjects/angular?view=tricky');
    (h.routeNativeElement!.querySelector('.bookmark-button') as HTMLButtonElement).click();
    const practice = await h.navigateByUrl(
      link(h, 'Practice this question').getAttribute('href')!,
      PracticeComponent,
    );
    expect(practice.previewCount()).toBe(1);
    practice.startPractice();
    expect(practice.currentQuestion()!.block.id).toBe('signals-0');
    expect(practice.isQuestionBookmarked('signals-0')).toBe(true);
    practice.restart();
    practice.updateFilter({ categoryId: 'async' });
    h.detectChanges();
    expect(practice.filter().questionId).toBeUndefined();
    expect(practice.filter().topicId).toBeUndefined();
    expect(practice.previewCount()).toBe(6);
    await h.navigateByUrl('/practice?subjectId=angular&questionType=invalid&difficulty=invalid');
    expect(practice.filter()).toMatchObject({ questionType: 'all', difficulty: 'all' });
    expect(practice.previewCount()).toBe(12);
    await h.navigateByUrl('/practice');
    expect(practice.filter().subjectId).toBeUndefined();
  });

  it('shows a recoverable load error and prevents starting an incomplete session', async () => {
    const pending = new Stream<Topic[]>();
    getSubjectTopics.mockReturnValueOnce(pending);
    const h = await RouterTestingHarness.create();
    const practice = await h.navigateByUrl('/practice?subjectId=angular', PracticeComponent);
    expect(button(h, 'Start practice').disabled).toBe(true);
    practice.startPractice();
    expect(practice.started()).toBe(false);
    pending.error(new Error('offline'));
    h.detectChanges();
    expect(h.routeNativeElement!.textContent).toContain("Questions couldn't be loaded");
    button(h, 'Retry loading').click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(practice.previewCount()).toBe(12);
    expect(button(h, 'Start practice').disabled).toBe(false);
  });

  it('recovers a catalog failure without treating it as an empty question bank', async () => {
    getSubjects.mockReturnValueOnce(throwError(() => new Error('catalog offline')));
    const h = await RouterTestingHarness.create();
    const practice = await h.navigateByUrl('/practice', PracticeComponent);
    expect(button(h, 'Start practice').disabled).toBe(true);
    expect(h.routeNativeElement!.textContent).toContain("Questions couldn't be loaded");
    button(h, 'Retry loading').click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(practice.previewCount()).toBe(12);
    practice.setSessionLength('20');
    expect(practice.plannedCount()).toBe(12);
    practice.setSessionLength('0');
    practice.startPractice();
    expect(practice.pool()).toHaveLength(12);
  });

  it('recovers a failed subject bank load and gives an actionable empty search', async () => {
    getSubjectTopics.mockReturnValueOnce(throwError(() => new Error('offline')));
    const h = await RouterTestingHarness.create('/subjects/angular?view=tricky');
    expect(h.routeNativeElement!.textContent).toContain("Questions couldn't be loaded");
    button(h, 'Retry').click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(h.routeNativeElement!.querySelectorAll('app-question-card')).toHaveLength(10);
    await h.navigateByUrl('/subjects/angular?view=tricky&q=absent&page=2');
    expect(h.routeNativeElement!.textContent).toContain('No questions match your filters');
    button(h, 'Clear filters').click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/subjects/angular?view=tricky');
    expect(h.routeNativeElement!.querySelectorAll('app-question-card')).toHaveLength(10);
  });
});
