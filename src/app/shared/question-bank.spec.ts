import { describe, expect, it } from 'vitest';
import { QuestionBlock, Topic } from '../core/models';
import { difficultyFrom, questionTypeFrom, selectQuestions } from './question-bank';

function question(
  id: string,
  order: number,
  type: QuestionBlock['type'] = 'tricky-question',
  extra: Partial<QuestionBlock> = {},
): QuestionBlock {
  return {
    id,
    type,
    order,
    question: `Prompt ${id}`,
    answer: `secret-${id}`,
    explanation: 'because',
    ...extra,
  };
}

function topic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'signals',
    subjectId: 'angular',
    categoryId: 'modern',
    title: 'Signals',
    description: '',
    difficulty: 'beginner',
    interviewPriority: 'high',
    tags: ['reactivity'],
    blocks: [question('q-late', 2), question('q-early', 1)],
    ...overrides,
  };
}

describe('question bank parsers', () => {
  it('accepts known question types and difficulties', () => {
    expect(questionTypeFrom('scenario-question')).toBe('scenario-question');
    expect(questionTypeFrom('output-question')).toBe('output-question');
    expect(difficultyFrom('intermediate')).toBe('intermediate');
  });

  it('falls back to all for missing or unknown values', () => {
    expect(questionTypeFrom(null)).toBe('all');
    expect(questionTypeFrom('essay')).toBe('all');
    expect(difficultyFrom(undefined)).toBe('all');
    expect(difficultyFrom('expert')).toBe('all');
  });
});

describe('selectQuestions', () => {
  const angular = topic();
  const forms = topic({
    id: 'forms',
    categoryId: 'forms',
    title: 'Reactive Forms',
    difficulty: 'advanced',
    tags: ['forms'],
    blocks: [
      question('q-forms', 1, 'tricky-question', {
        code: 'form.valid',
        question: 'How do validators run?',
      }),
      question('q-output', 2, 'output-question'),
      { id: 'concept', type: 'concept', order: 0, content: 'Intro' },
    ],
  });
  const topics = [angular, forms];

  it('returns question blocks in order and skips other block types', () => {
    const selected = selectQuestions(topics);
    expect(selected.map((item) => item.block.id)).toEqual([
      'q-early',
      'q-late',
      'q-forms',
      'q-output',
    ]);
    expect(selected[0]).toMatchObject({
      topicId: 'signals',
      topicTitle: 'Signals',
      subjectId: 'angular',
      difficulty: 'beginner',
    });
  });

  it('filters by subject, topic, category, difficulty, type, and identity', () => {
    expect(selectQuestions(topics, { subjectId: 'javascript' })).toEqual([]);
    expect(selectQuestions(topics, { topicId: 'forms' }).map((item) => item.block.id)).toEqual([
      'q-forms',
      'q-output',
    ]);
    expect(selectQuestions(topics, { categoryId: 'modern' })).toHaveLength(2);
    expect(selectQuestions(topics, { difficulty: 'advanced' }).map((item) => item.topicId)).toEqual(
      ['forms', 'forms'],
    );
    expect(selectQuestions(topics, { difficulty: 'all' })).toHaveLength(4);
    expect(
      selectQuestions(topics, { questionType: 'output-question' }).map((item) => item.block.id),
    ).toEqual(['q-output']);
    expect(selectQuestions(topics, { questionId: 'q-late' }).map((item) => item.block.id)).toEqual([
      'q-late',
    ]);
  });

  it('keeps bookmarked and weak topics only when those sets say so', () => {
    expect(
      selectQuestions(topics, { onlyBookmarked: true }, new Set(['q-forms'])).map(
        (item) => item.block.id,
      ),
    ).toEqual(['q-forms']);
    expect(
      selectQuestions(topics, { onlyWeak: true }, new Set(), new Set(['signals'])).every(
        (item) => item.topicId === 'signals',
      ),
    ).toBe(true);
    expect(selectQuestions(topics, { onlyWeak: true })).toEqual([]);
  });

  it('searches prompts, titles, tags, and code without revealing answers', () => {
    expect(
      selectQuestions(topics, { searchTerm: '  Validators ' }).map((item) => item.block.id),
    ).toEqual(['q-forms']);
    expect(selectQuestions(topics, { searchTerm: 'reactivity' })).toHaveLength(2);
    expect(selectQuestions(topics, { searchTerm: 'form.valid' })).toHaveLength(1);
    expect(selectQuestions(topics, { searchTerm: 'secret-q-forms' })).toEqual([]);
  });
});
