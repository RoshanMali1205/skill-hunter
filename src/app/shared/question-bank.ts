import { Difficulty, QuestionBlock, QuestionBlockType, Topic } from '../core/models/content.models';
import { PracticeFilter, PracticeQuestion } from '../core/models/filters.models';

export function questionTypeFrom(value: string | undefined | null): QuestionBlockType | 'all' {
  return value === 'tricky-question' ||
    value === 'output-question' ||
    value === 'interview-question' ||
    value === 'scenario-question'
    ? value
    : 'all';
}

export function difficultyFrom(value: string | undefined | null): Difficulty | 'all' {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced' ? value : 'all';
}

/** One selection rule for browsing a question bank and practising that exact set. */
export function selectQuestions(
  topics: Topic[],
  filter: PracticeFilter = {},
  bookmarkedIds: ReadonlySet<string> = new Set(),
  weakTopicIds: ReadonlySet<string> = new Set(),
): PracticeQuestion[] {
  const term = filter.searchTerm?.trim().toLowerCase() ?? '';
  return topics.flatMap((topic) => {
    if (filter.subjectId && topic.subjectId !== filter.subjectId) return [];
    if (filter.topicId && topic.id !== filter.topicId) return [];
    if (filter.categoryId && topic.categoryId !== filter.categoryId) return [];
    if (filter.difficulty && filter.difficulty !== 'all' && topic.difficulty !== filter.difficulty)
      return [];
    if (filter.onlyWeak && !weakTopicIds.has(topic.id)) return [];

    return [...topic.blocks]
      .sort((a, b) => a.order - b.order)
      .filter((block): block is QuestionBlock => 'question' in block)
      .filter((block) => {
        if (filter.questionId && block.id !== filter.questionId) return false;
        if (
          filter.questionType &&
          filter.questionType !== 'all' &&
          block.type !== filter.questionType
        )
          return false;
        if (filter.onlyBookmarked && !bookmarkedIds.has(block.id)) return false;
        // Search the prompt/context, never the hidden answer.
        return (
          !term ||
          [topic.title, ...topic.tags, block.title, block.question, block.code]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        );
      })
      .map((block) => ({
        block,
        topicId: topic.id,
        topicTitle: topic.title,
        subjectId: topic.subjectId,
        difficulty: topic.difficulty,
      }));
  });
}
