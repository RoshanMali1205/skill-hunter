import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import {
  MockGrade,
  MockDifficulty,
  MockInterviewResult,
  MockLengthOption,
  MockRating,
  PracticeQuestion,
  Topic,
} from '../models';

export const MOCK_LENGTHS: MockLengthOption[] = [
  { id: 'quick', label: 'Quick', questions: 5, minutes: 10, blurb: 'A fast warm-up' },
  { id: 'standard', label: 'Standard', questions: 10, minutes: 20, blurb: 'Like a real round' },
  { id: 'full', label: 'Full', questions: 15, minutes: 30, blurb: 'The full challenge' },
];

const MAX_SAVED_RESULTS = 50;
const MAX_SAVED_ANSWER_LENGTH = 1500;
/** First pass keeps a session from being dominated by one topic. */
const MAX_PER_TOPIC = 2;

@Injectable({ providedIn: 'root' })
export class MockInterviewService {
  private readonly storage = inject(StorageService);

  private readonly _results = signal<MockInterviewResult[]>(
    this.storage.get<MockInterviewResult[]>(STORAGE_KEYS.mockInterviews, []),
  );

  /** Newest first. */
  readonly results = this._results.asReadonly();

  /**
   * Picks a mixed set of questions: every question type is rotated through
   * and no topic repeats more than twice until the pool runs dry.
   */
  buildSession(
    topics: Topic[],
    count: number,
    difficulty: MockDifficulty = 'all',
  ): PracticeQuestion[] {
    const pool: PracticeQuestion[] = [];
    for (const topic of topics) {
      if (difficulty !== 'all' && topic.difficulty !== difficulty) continue;
      for (const block of topic.blocks) {
        if (!('question' in block)) continue;
        pool.push({
          block,
          topicId: topic.id,
          topicTitle: topic.title,
          subjectId: topic.subjectId,
          difficulty: topic.difficulty,
        });
      }
    }

    const buckets = new Map<string, PracticeQuestion[]>();
    for (const question of this.shuffle(pool)) {
      const list = buckets.get(question.block.type) ?? [];
      list.push(question);
      buckets.set(question.block.type, list);
    }

    const picked: PracticeQuestion[] = [];
    const perTopic = new Map<string, number>();
    const leftovers: PracticeQuestion[] = [];
    const queues = [...buckets.values()];

    while (picked.length < count && queues.some((q) => q.length > 0)) {
      for (const queue of queues) {
        const next = queue.shift();
        if (!next) continue;
        const used = perTopic.get(next.topicId) ?? 0;
        if (used >= MAX_PER_TOPIC) {
          leftovers.push(next);
          continue;
        }
        perTopic.set(next.topicId, used + 1);
        picked.push(next);
        if (picked.length === count) break;
      }
    }

    for (const question of this.shuffle(leftovers)) {
      if (picked.length >= count) break;
      picked.push(question);
    }

    return this.shuffle(picked);
  }

  /** How many questions a subject can offer. */
  countQuestions(topics: Topic[], difficulty: MockDifficulty = 'all'): number {
    return topics
      .filter((t) => difficulty === 'all' || t.difficulty === difficulty)
      .reduce((sum, t) => sum + t.blocks.filter((b) => 'question' in b).length, 0);
  }

  /** "Got it" = 1 point, "partly" = half, anything else = 0. Returns 0–100. */
  calculateScore(ratings: MockRating[]): number {
    if (ratings.length === 0) return 0;
    const points = ratings.reduce(
      (sum, r) => sum + (r === 'got-it' ? 1 : r === 'partly' ? 0.5 : 0),
      0,
    );
    return Math.round((points / ratings.length) * 100);
  }

  gradeFor(score: number): MockGrade {
    if (score >= 85) {
      return {
        title: 'Interview ready!',
        message:
          'You answered like someone who has done this before. Keep it sharp with a quick run every few days.',
        tone: 'great',
      };
    }
    if (score >= 70) {
      return {
        title: 'Strong performance',
        message: 'You know most of it. Review the questions you missed and you will be there.',
        tone: 'good',
      };
    }
    if (score >= 50) {
      return {
        title: 'Getting there',
        message: 'You have a good base. The topics below are your best chance to improve fast.',
        tone: 'ok',
      };
    }
    return {
      title: 'Keep practising',
      message: 'This is how you learn what to study. Read the answers below, then try again.',
      tone: 'low',
    };
  }

  save(result: Omit<MockInterviewResult, 'id'>): MockInterviewResult {
    const saved: MockInterviewResult = {
      ...result,
      // Typed answers can be long; keep storage small.
      items: result.items?.map((item) => ({
        ...item,
        typedAnswer: item.typedAnswer?.slice(0, MAX_SAVED_ANSWER_LENGTH) || undefined,
      })),
      id: `mock-${Date.now()}`,
    };
    this._results.update((all) => [saved, ...all].slice(0, MAX_SAVED_RESULTS));
    this.persist();
    return saved;
  }

  /** Overall numbers shown at the top of the results overview. */
  summarize(results: MockInterviewResult[]): {
    count: number;
    average: number;
    best: number;
    last: number | null;
    changeFromPrevious: number | null;
  } {
    if (results.length === 0) {
      return { count: 0, average: 0, best: 0, last: null, changeFromPrevious: null };
    }
    const scores = results.map((r) => r.score); // newest first
    return {
      count: results.length,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
      last: scores[0],
      changeFromPrevious: scores.length > 1 ? scores[0] - scores[1] : null,
    };
  }

  /** Score of the most recent interview for a subject, or null if there is none. */
  lastScoreFor(subjectId: string): number | null {
    return this._results().find((r) => r.subjectId === subjectId)?.score ?? null;
  }

  bestScoreFor(subjectId: string): number | null {
    const scores = this._results()
      .filter((r) => r.subjectId === subjectId)
      .map((r) => r.score);
    return scores.length === 0 ? null : Math.max(...scores);
  }

  resetAll(): void {
    this._results.set([]);
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
    this.storage.set(STORAGE_KEYS.mockInterviews, this._results());
  }
}
