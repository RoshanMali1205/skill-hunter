import { Difficulty, InterviewPriority, QuestionBlock, QuestionBlockType } from './content.models';
import { ConfidenceLevel, TopicStatus } from './progress.models';

export interface TopicFilter {
  categoryId?: string;
  difficulty?: Difficulty | 'all';
  priority?: InterviewPriority | 'all';
  status?: TopicStatus | 'all';
  bookmarked?: boolean;
  confidence?: ConfidenceLevel | 'all';
  searchTerm?: string;
}

export interface PracticeFilter {
  subjectId?: string;
  categoryId?: string;
  topicId?: string;
  difficulty?: Difficulty | 'all';
  questionType?: QuestionBlockType | 'all';
  onlyBookmarked?: boolean;
  onlyWeak?: boolean;
  random?: boolean;
}

export interface PracticeQuestion {
  block: QuestionBlock;
  topicId: string;
  topicTitle: string;
  subjectId: string;
  difficulty: Difficulty;
}

export interface DashboardMetrics {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  completionPercentage: number;
  bookmarkedTopics: number;
  revisionTopics: number;
  questionsAttempted: number;
  correctAnswers: number;
  practiceAccuracy: number;
}
