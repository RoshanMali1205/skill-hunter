import { describe, expect, it } from 'vitest';
import { Topic } from '../../core/models';
import { buildTopicNarration } from './topic-narration';

const topic: Topic = {
  id: 'signals',
  categoryId: 'modern',
  subjectId: 'angular',
  title: 'Signals',
  description: '**Reactive** state',
  difficulty: 'beginner',
  interviewPriority: 'high',
  tags: [],
  blocks: [
    {
      id: 'code',
      type: 'code-example',
      order: 2,
      title: 'Create one',
      language: 'typescript',
      code: 'const count = signal(0);',
      explanation: 'A signal stores a value.',
    },
    {
      id: 'ask',
      type: 'interview-question',
      order: 1,
      question: 'Why use signals?',
      code: "dispatch({ type: 'itemAdded' })",
      answer: 'They tell Angular what changed.',
      explanation: 'Only the consumers of that signal update.',
    },
    {
      id: 'out',
      type: 'output-question',
      order: 3,
      question: 'What is logged?',
      code: 'console.log(secretToken)',
      answer: 'It logs 1.',
      explanation: '',
    },
  ],
};

describe('buildTopicNarration', () => {
  const spoken = buildTopicNarration(topic);

  it('reads the title, the explanation, and the interview answer', () => {
    expect(spoken.startsWith('Signals.')).toBe(true);
    expect(spoken).toContain('Reactive state');
    expect(spoken).toContain('Why use signals?');
    expect(spoken).toContain('They tell Angular what changed.');
    expect(spoken).toContain('Only the consumers of that signal update.');
    expect(spoken).toContain('A signal stores a value.');
    expect(spoken).toContain('It logs 1.');
  });

  it('leaves code samples out of the narration', () => {
    expect(spoken).not.toContain('signal(0)');
    expect(spoken).not.toContain('itemAdded');
    expect(spoken).not.toContain('secretToken');
    expect(spoken).not.toContain('console.log');
  });
});
