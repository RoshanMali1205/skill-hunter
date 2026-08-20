import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticeAttempt, Topic } from '../models';
import { PracticeFilter } from '../models/filters.models';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { PracticeService } from './practice.service';

const topics: Topic[] = [
  {
    id: 'signals',
    categoryId: 'modern',
    subjectId: 'angular',
    title: 'Signals',
    description: '',
    difficulty: 'beginner',
    interviewPriority: 'high',
    tags: [],
    blocks: [
      { id: 'concept', type: 'concept', order: 1, content: 'A concept' },
      {
        id: 'q-output',
        type: 'output-question',
        order: 2,
        question: 'Output?',
        answer: '1',
        explanation: '',
      },
      {
        id: 'q-interview',
        type: 'interview-question',
        order: 3,
        question: 'Why?',
        answer: 'Because',
        explanation: '',
      },
    ],
  },
  {
    id: 'rxjs',
    categoryId: 'async',
    subjectId: 'angular',
    title: 'RxJS',
    description: '',
    difficulty: 'advanced',
    interviewPriority: 'must-know',
    tags: [],
    blocks: [
      {
        id: 'q-rxjs',
        type: 'tricky-question',
        order: 1,
        question: 'Tricky?',
        answer: 'Yes',
        explanation: '',
      },
    ],
  },
];

describe('PracticeService', () => {
  let service: PracticeService;
  let set: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    set = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        PracticeService,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
      ],
    });
    service = TestBed.inject(PracticeService);
  });

  afterEach(() => vi.useRealTimers());

  it('builds a pool from question blocks only', () => {
    const pool = service.buildQuestionPool(topics, {}, new Set(), new Set());
    expect(pool.map((item) => item.block.id)).toEqual(['q-output', 'q-interview', 'q-rxjs']);
    expect(pool[0]).toMatchObject({
      topicId: 'signals',
      subjectId: 'angular',
      difficulty: 'beginner',
    });
  });

  it.each<[string, PracticeFilter, string[]]>([
    ['topic', { topicId: 'rxjs' }, ['q-rxjs']],
    [
      'category and difficulty',
      { categoryId: 'modern', difficulty: 'beginner' },
      ['q-output', 'q-interview'],
    ],
    ['question type', { questionType: 'interview-question' }, ['q-interview']],
    ['bookmarks', { onlyBookmarked: true }, ['q-output']],
    ['weak topics', { onlyWeak: true }, ['q-rxjs']],
  ])('filters questions by %s', (_label, filter, expected) => {
    const pool = service.buildQuestionPool(
      topics,
      filter,
      new Set(['q-output']),
      new Set(['rxjs']),
    );
    expect(pool.map((item) => item.block.id)).toEqual(expected);
  });

  it('derives practice totals, accuracy, and weak topics', () => {
    const history: PracticeAttempt[] = [
      {
        id: '1',
        questionId: 'q1',
        topicId: 'signals',
        subjectId: 'angular',
        result: 'correct',
        attemptedAt: '',
      },
      {
        id: '2',
        questionId: 'q2',
        topicId: 'signals',
        subjectId: 'angular',
        result: 'incorrect',
        attemptedAt: '',
      },
      {
        id: '3',
        questionId: 'q3',
        topicId: 'rxjs',
        subjectId: 'angular',
        result: 'needs-revision',
        attemptedAt: '',
      },
    ];
    service.replaceAll(history);

    expect(service.questionsAttempted()).toBe(3);
    expect(service.correctAnswers()).toBe(1);
    expect(service.accuracy()).toBe(33);
    expect(service.incorrectTopicIds()).toEqual(new Set(['signals', 'rxjs']));
  });

  it('records and persists an attempt with a stable timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00.000Z'));

    service.recordAttempt('q1', 'signals', 'angular', 'correct', 45);

    expect(service.history()[0]).toEqual({
      id: `q1-${new Date('2026-08-19T12:00:00.000Z').getTime()}`,
      questionId: 'q1',
      topicId: 'signals',
      subjectId: 'angular',
      result: 'correct',
      attemptedAt: '2026-08-19T12:00:00.000Z',
      timeSpentSeconds: 45,
    });
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.practiceHistory, service.history());
  });

  it('returns a shuffled copy when random mode is enabled', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const originalOrder = topics[0]!.blocks.map((block) => block.id);
    const pool = service.buildQuestionPool(topics, { random: true }, new Set(), new Set());

    expect(pool.map((item) => item.block.id)).toEqual(['q-interview', 'q-rxjs', 'q-output']);
    expect(topics[0]!.blocks.map((block) => block.id)).toEqual(originalOrder);
  });
});
