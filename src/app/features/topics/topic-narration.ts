import { ContentBlock, QuestionBlock, Topic } from '../../core/models';
import { markdownToPlainText } from '../../shared/markdown';

/**
 * Spoken script for Listen. Code samples are left out: hearing braces and
 * punctuation is harder than reading them, and the explanation still carries
 * the idea. Interview answers are included, because that is what a learner
 * wants to hear away from the screen.
 */
export function buildTopicNarration(topic: Topic): string {
  const parts: string[] = [topic.title, topic.description];
  const blocks = [...topic.blocks].sort((a, b) => a.order - b.order);
  for (const block of blocks) {
    parts.push(...linesForBlock(block));
  }
  return markdownToPlainText(parts.filter((part) => !!part && part.trim()).join('\n\n'));
}

function linesForBlock(block: ContentBlock): string[] {
  switch (block.type) {
    case 'concept':
    case 'best-practice':
      return [block.title ?? '', block.content, ...(block.keyPoints ?? [])];
    case 'code-example':
      return [block.title ?? '', block.explanation];
    case 'common-mistake':
      return ['Common mistake.', block.mistake, block.whyItHappens, block.correctApproach];
    case 'summary':
      return [block.title ?? 'Summary.', block.content];
    case 'interview-question':
    case 'tricky-question':
    case 'scenario-question':
    case 'output-question':
      return linesForQuestion(block);
    default:
      return [];
  }
}

function linesForQuestion(block: QuestionBlock): string[] {
  const label =
    block.type === 'tricky-question'
      ? 'Tricky question.'
      : block.type === 'scenario-question'
        ? 'Scenario.'
        : block.type === 'output-question'
          ? 'Output question.'
          : 'Interview question.';
  return [label, block.question, 'Answer.', block.answer, block.explanation];
}
