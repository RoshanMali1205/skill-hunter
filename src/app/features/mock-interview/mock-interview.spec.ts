import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, Topic } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { MockInterviewService } from '../../core/services/mock-interview.service';
import { PracticeService } from '../../core/services/practice.service';
import { RevisionService } from '../../core/services/revision.service';
import { MockInterviewComponent } from './mock-interview';

const topics: Topic[] = ['a', 'b', 'c'].map((id) => ({
  id,
  categoryId: 'c',
  subjectId: 'angular',
  title: `Topic ${id}`,
  description: '',
  difficulty: 'beginner' as const,
  interviewPriority: 'high' as const,
  tags: [],
  blocks: [1, 2].map((n) => ({
    id: `${id}-q${n}`,
    type: 'interview-question' as const,
    order: n,
    question: `Question ${id}${n}?`,
    answer: 'Answer',
    explanation: '',
  })),
}));
const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [],
};

describe('MockInterviewComponent', () => {
  /** Questions the fake service reports per level; tests change these to simulate sparse subjects. */
  let levelCounts: Record<string, number>;
  const recordAttempt = vi.fn();
  const addToRevision = vi.fn();
  const save = vi.fn((r: object) => ({ ...r, id: 'mock-1' }));

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ContentService,
          useValue: { getSubjects: () => of([subject]), getSubjectTopics: () => of(topics) },
        },
        { provide: PracticeService, useValue: { recordAttempt } },
        { provide: RevisionService, useValue: { addToRevision } },
        {
          provide: MockInterviewService,
          useValue: {
            countQuestions: (_topics: unknown, level: string = 'all') => levelCounts[level] ?? 6,
            buildSession: () =>
              topics.flatMap((t) =>
                t.blocks.map((block) => ({
                  block,
                  topicId: t.id,
                  topicTitle: t.title,
                  subjectId: 'angular',
                  difficulty: 'beginner' as const,
                })),
              ),
            calculateScore: () => 50,
            gradeFor: () => ({ title: 'Getting there', message: '', tone: 'ok' }),
            bestScoreFor: () => null,
            lastScoreFor: () => null,
            summarize: () => ({
              count: 0,
              average: 0,
              best: 0,
              last: null,
              changeFromPrevious: null,
            }),
            results: () => [],
            save,
          },
        },
      ],
    });
    window.scrollTo = vi.fn();
    const fixture = TestBed.createComponent(MockInterviewComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    levelCounts = { all: 6, beginner: 6, intermediate: 6, advanced: 6 };
    vi.useFakeTimers();
    recordAttempt.mockClear();
    addToRevision.mockClear();
    save.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('cannot start until a subject is picked, then limits questions to what exists', () => {
    const c = setup();
    expect(c.selectedEntry()).toBeNull();
    c.start();
    expect(c.phase()).toBe('setup');

    c.selectSubject('angular');
    expect(c.plannedQuestions()).toBe(6);
    expect(c.plannedMinutes()).toBe(12);
  });

  it('only allows rating after the answer is shown', () => {
    const c = setup();
    c.selectSubject('angular');
    c.start();
    c.rate('got-it');
    expect(c.currentIndex()).toBe(0);

    c.revealAnswer();
    c.rate('got-it');
    expect(c.currentIndex()).toBe(1);
    expect(c.answerRevealed()).toBe(false);
  });

  it('brings skipped questions back at the end', () => {
    const c = setup();
    c.selectSubject('angular');
    c.start();
    c.skip();
    expect(c.currentIndex()).toBe(1);
    for (let i = 0; i < 5; i++) {
      c.revealAnswer();
      c.rate('got-it');
    }
    expect(c.phase()).toBe('running');
    expect(c.currentIndex()).toBe(0);
    c.revealAnswer();
    c.rate('missed');
    expect(c.phase()).toBe('results');
  });

  it('records attempts and adds weak topics to revision when finishing', () => {
    const c = setup();
    c.selectSubject('angular');
    c.start();
    c.revealAnswer();
    c.rate('got-it');
    c.revealAnswer();
    c.rate('missed');
    c.finish();

    expect(c.phase()).toBe('results');
    expect(recordAttempt).toHaveBeenCalledTimes(2);
    expect(recordAttempt.mock.calls[0][3]).toBe('correct');
    expect(recordAttempt.mock.calls[1][3]).toBe('incorrect');
    expect(addToRevision).toHaveBeenCalledWith('a');
    expect(save.mock.calls[0][0]).toMatchObject({
      gotIt: 1,
      missed: 1,
      skipped: 4,
      totalQuestions: 6,
    });
    expect(c.weakTopics().map((t) => t.topicId)).toContain('a');
  });

  it('finishes by itself when time runs out', () => {
    const c = setup();
    c.selectSubject('angular');
    c.start();
    vi.advanceTimersByTime(6 * 120 * 1000 + 1000);
    expect(c.phase()).toBe('results');
    expect(save.mock.calls[0][0]).toMatchObject({ timedOut: true });
  });

  it('rates with keyboard shortcuts once the answer is showing', () => {
    const c = setup();
    c.selectSubject('angular');
    c.start();
    c.revealAnswer();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(c.states()[0].rating).toBe('partly');
  });

  it('protects a running interview from being left silently', () => {
    const c = setup();
    expect(c.canLeave()).toBe(true); // setup screen: nothing to lose

    c.selectSubject('angular');
    c.start();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(c.canLeave()).toBe(false);
    confirm.mockReturnValue(true);
    expect(c.canLeave()).toBe(true);
    confirm.mockRestore();
  });

  it('selects a subject and a length through native radio inputs', () => {
    const c = setup();
    const subjectRadio = document.querySelector('input[name="mock-subject"]') as HTMLInputElement;
    subjectRadio.click();
    expect(c.selectedSubjectId()).toBe('angular');

    const quick = document.querySelector(
      'input[name="mock-length"][value="quick"]',
    ) as HTMLInputElement;
    quick.click();
    expect(c.selectedLength().id).toBe('quick');
  });

  it('saves per-question detail so a past interview can be reopened', () => {
    const c = setup();
    c.selectSubject('angular');
    c.start();
    c.updateTypedAnswer('my answer');
    c.revealAnswer();
    c.rate('partly');
    c.finish();

    const saved = save.mock.calls[0][0] as {
      items: { questionId: string; rating: string; typedAnswer: string }[];
    };
    expect(saved.items).toHaveLength(6);
    expect(saved.items[0]).toMatchObject({
      questionId: 'a-q1',
      rating: 'partly',
      typedAnswer: 'my answer',
    });
  });

  it('reopens a saved scorecard with its review, without touching progress', () => {
    const c = setup();
    recordAttempt.mockClear();
    c.openSaved({
      id: 'old',
      subjectId: 'angular',
      finishedAt: '2026-01-01T10:00:00Z',
      totalQuestions: 2,
      gotIt: 1,
      partly: 0,
      missed: 1,
      skipped: 0,
      score: 50,
      durationSeconds: 60,
      timeLimitSeconds: 240,
      timedOut: false,
      items: [
        { questionId: 'a-q1', topicId: 'a', rating: 'got-it', typedAnswer: 'yes' },
        { questionId: 'b-q2', topicId: 'b', rating: 'missed' },
        { questionId: 'gone', topicId: 'a', rating: 'missed' }, // removed from content since
      ],
    });
    expect(c.phase()).toBe('results');
    expect(c.reopened()).toBe(true);
    expect(c.reviewItems().map((i) => i.rating)).toEqual(['got-it', 'missed']);
    expect(c.reviewItems()[0].typedAnswer).toBe('yes');
    expect(c.isNewBest()).toBe(false);
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(c.selectedSubjectId()).toBe('angular');
  });

  it('falls back to Mixed when the chosen subject has nothing at the chosen level', () => {
    levelCounts['advanced'] = 0;
    const c = setup();
    c.selectDifficulty('advanced');
    expect(c.selectedDifficulty()).toBe('advanced');
    c.selectSubject('angular');
    expect(c.selectedDifficulty()).toBe('all');
    expect(c.levelCounts()).toEqual({ all: 6, beginner: 6, intermediate: 6, advanced: 0 });
  });

  it('switches between the New interview and My results tabs', () => {
    const c = setup();
    expect(c.activeTab()).toBe('new');
    c.setTab('results');
    expect(c.activeTab()).toBe('results');
    c.backToSetup();
    expect(c.activeTab()).toBe('new');
    c.backToResults();
    expect(c.activeTab()).toBe('results');
  });
});
