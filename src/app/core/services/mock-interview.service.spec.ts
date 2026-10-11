import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Topic } from '../models';
import { StorageService } from '../storage/storage.service';
import { MockInterviewService } from './mock-interview.service';

function makeTopic(id: string, types: string[]): Topic {
  return {
    id,
    categoryId: 'c',
    subjectId: 'angular',
    title: id,
    description: '',
    difficulty: 'beginner',
    interviewPriority: 'high',
    tags: [],
    blocks: [
      { id: `${id}-concept`, type: 'concept', order: 0, content: 'x' },
      ...types.map((type, i) => ({
        id: `${id}-q${i}`,
        type: type as 'interview-question',
        order: i + 1,
        question: 'Q?',
        answer: 'A',
        explanation: '',
      })),
    ],
  };
}

describe('MockInterviewService', () => {
  let service: MockInterviewService;
  let store: Record<string, unknown>;

  beforeEach(() => {
    store = {};
    TestBed.configureTestingModule({
      providers: [
        {
          provide: StorageService,
          useValue: {
            get: (key: string, fallback: unknown) => store[key] ?? fallback,
            set: (key: string, value: unknown) => (store[key] = value),
          },
        },
      ],
    });
    service = TestBed.inject(MockInterviewService);
  });

  it('builds a session of the requested size from question blocks only', () => {
    const topics = ['a', 'b', 'c', 'd'].map((id) =>
      makeTopic(id, ['interview-question', 'tricky-question', 'output-question']),
    );
    const session = service.buildSession(topics, 6);
    expect(session).toHaveLength(6);
    expect(new Set(session.map((q) => q.block.id)).size).toBe(6);
    expect(session.every((q) => 'question' in q.block)).toBe(true);
  });

  it('mixes question types', () => {
    const topics = ['a', 'b', 'c', 'd'].map((id) =>
      makeTopic(id, ['interview-question', 'tricky-question', 'output-question']),
    );
    const types = new Set(service.buildSession(topics, 6).map((q) => q.block.type));
    expect(types.size).toBe(3);
  });

  it('does not repeat a topic more than twice while other topics are available', () => {
    const topics = ['a', 'b', 'c'].map((id) =>
      makeTopic(id, [
        'interview-question',
        'interview-question',
        'interview-question',
        'interview-question',
      ]),
    );
    const session = service.buildSession(topics, 6);
    const counts = new Map<string, number>();
    session.forEach((q) => counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1));
    expect(Math.max(...counts.values())).toBe(2);
  });

  it('returns fewer questions when the subject runs out', () => {
    const session = service.buildSession([makeTopic('a', ['interview-question'])], 10);
    expect(session).toHaveLength(1);
  });

  it('fills up from over-used topics when needed', () => {
    const topic = makeTopic('a', Array(5).fill('interview-question'));
    expect(service.buildSession([topic], 5)).toHaveLength(5);
  });

  it('scores got-it as 1, partly as 0.5, everything else as 0', () => {
    expect(service.calculateScore(['got-it', 'partly', 'missed', 'skipped'])).toBe(38);
    expect(service.calculateScore(['got-it', 'got-it'])).toBe(100);
    expect(service.calculateScore([])).toBe(0);
  });

  it('grades by score band', () => {
    expect(service.gradeFor(90).tone).toBe('great');
    expect(service.gradeFor(70).tone).toBe('good');
    expect(service.gradeFor(50).tone).toBe('ok');
    expect(service.gradeFor(10).tone).toBe('low');
  });

  it('saves results newest first and tracks the best score per subject', () => {
    const base = {
      finishedAt: '2026-01-01',
      totalQuestions: 5,
      gotIt: 0,
      partly: 0,
      missed: 0,
      skipped: 0,
      durationSeconds: 60,
      timeLimitSeconds: 600,
      timedOut: false,
    };
    service.save({ ...base, subjectId: 'angular', score: 40 });
    service.save({ ...base, subjectId: 'angular', score: 80 });
    service.save({ ...base, subjectId: 'angular', score: 60 });
    expect(service.results()[0].score).toBe(60);
    expect(service.bestScoreFor('angular')).toBe(80);
    expect(service.bestScoreFor('ui')).toBeNull();
  });

  it('clears results on reset', () => {
    service.save({
      subjectId: 'ui',
      finishedAt: 'x',
      totalQuestions: 1,
      gotIt: 1,
      partly: 0,
      missed: 0,
      skipped: 0,
      score: 100,
      durationSeconds: 1,
      timeLimitSeconds: 1,
      timedOut: false,
    });
    service.resetAll();
    expect(service.results()).toEqual([]);
  });

  it('summarises results for the overview', () => {
    const mk = (score: number) => ({
      id: String(score),
      subjectId: 'angular',
      finishedAt: 'x',
      totalQuestions: 5,
      gotIt: 0,
      partly: 0,
      missed: 0,
      skipped: 0,
      score,
      durationSeconds: 1,
      timeLimitSeconds: 1,
      timedOut: false,
    });
    expect(service.summarize([])).toMatchObject({ count: 0, last: null, changeFromPrevious: null });
    // newest first
    expect(service.summarize([mk(80), mk(60), mk(100)])).toEqual({
      count: 3,
      average: 80,
      best: 100,
      last: 80,
      changeFromPrevious: 20,
    });
  });

  it('finds the last score for a subject and trims long saved answers', () => {
    const base = {
      finishedAt: 'x',
      totalQuestions: 1,
      gotIt: 1,
      partly: 0,
      missed: 0,
      skipped: 0,
      durationSeconds: 1,
      timeLimitSeconds: 1,
      timedOut: false,
    };
    service.save({ ...base, subjectId: 'ui', score: 30 });
    const saved = service.save({
      ...base,
      subjectId: 'ui',
      score: 70,
      items: [{ questionId: 'q', topicId: 't', rating: 'got-it', typedAnswer: 'x'.repeat(5000) }],
    });
    expect(service.lastScoreFor('ui')).toBe(70);
    expect(service.lastScoreFor('angular')).toBeNull();
    expect(saved.items?.[0].typedAnswer).toHaveLength(1500);
  });

  it('builds sessions and counts questions for a single difficulty level', () => {
    const easy = {
      ...makeTopic('e', ['interview-question', 'interview-question']),
      difficulty: 'beginner' as const,
    };
    const hard = { ...makeTopic('h', ['tricky-question']), difficulty: 'advanced' as const };
    expect(service.countQuestions([easy, hard])).toBe(3);
    expect(service.countQuestions([easy, hard], 'beginner')).toBe(2);
    expect(service.countQuestions([easy, hard], 'intermediate')).toBe(0);
    const session = service.buildSession([easy, hard], 5, 'advanced');
    expect(session).toHaveLength(1);
    expect(session[0].topicId).toBe('h');
  });
});
