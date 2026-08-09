export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type InterviewPriority = 'low' | 'medium' | 'high' | 'must-know';

export type ContentBlockType =
  | 'concept'
  | 'code-example'
  | 'output-question'
  | 'interview-question'
  | 'tricky-question'
  | 'scenario-question'
  | 'common-mistake'
  | 'best-practice'
  | 'summary';

export interface Subject {
  id: string;
  title: string;
  description: string;
  icon?: string;
  order: number;
  categories: Category[];
}

export interface Category {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  order: number;
  topics: TopicSummary[];
}

export interface TopicSummary {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  interviewPriority: InterviewPriority;
  estimatedMinutes?: number;
  tags: string[];
}

export interface Topic extends TopicSummary {
  subjectId: string;
  blocks: ContentBlock[];
  relatedTopicIds?: string[];
}

export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
  title?: string;
  order: number;
}

export interface ConceptBlock extends BaseContentBlock {
  type: 'concept';
  content: string;
  keyPoints?: string[];
}

export interface CodeExampleBlock extends BaseContentBlock {
  type: 'code-example';
  language: 'typescript' | 'javascript' | 'html' | 'scss' | 'css' | 'python' | 'json' | 'bash';
  code: string;
  explanation: string;
}

export type QuestionBlockType =
  | 'output-question'
  | 'interview-question'
  | 'tricky-question'
  | 'scenario-question';

export interface QuestionBlock extends BaseContentBlock {
  type: QuestionBlockType;
  question: string;
  code?: string;
  language?: string;
  answer: string;
  explanation: string;
  hints?: string[];
}

export interface CommonMistakeBlock extends BaseContentBlock {
  type: 'common-mistake';
  mistake: string;
  whyItHappens: string;
  correctApproach: string;
}

export interface BestPracticeBlock extends BaseContentBlock {
  type: 'best-practice';
  content: string;
  keyPoints?: string[];
}

export interface SummaryBlock extends BaseContentBlock {
  type: 'summary';
  content: string;
}

export type ContentBlock =
  | ConceptBlock
  | CodeExampleBlock
  | QuestionBlock
  | CommonMistakeBlock
  | BestPracticeBlock
  | SummaryBlock;

export interface SearchResult {
  subjectId: string;
  subjectTitle: string;
  categoryId: string;
  categoryTitle: string;
  topicId: string;
  topicTitle: string;
  matchedIn: 'title' | 'description' | 'tag' | 'question';
  snippet: string;
}
