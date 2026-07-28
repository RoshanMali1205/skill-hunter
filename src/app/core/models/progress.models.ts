export type TopicStatus = 'not-started' | 'in-progress' | 'completed';

export type ConfidenceLevel = 'not-rated' | 'low' | 'medium' | 'high';

export interface TopicProgress {
  topicId: string;
  subjectId: string;
  status: TopicStatus;
  completedBlockIds: string[];
  confidence: ConfidenceLevel;
  lastVisitedAt?: string;
  completedAt?: string;
  revisionCount: number;
}

export type BookmarkEntityType = 'topic' | 'question';

export interface Bookmark {
  id: string;
  entityId: string;
  entityType: BookmarkEntityType;
  subjectId: string;
  topicId: string;
  createdAt: string;
}

export interface PracticeAttempt {
  id: string;
  questionId: string;
  topicId: string;
  subjectId: string;
  result: 'correct' | 'incorrect' | 'needs-revision';
  attemptedAt: string;
  timeSpentSeconds?: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  defaultDifficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
  showAnswersAutomatically: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultDifficulty: 'all',
  showAnswersAutomatically: false,
};

export interface StoredApplicationData {
  version: number;
  progress: Record<string, TopicProgress>;
  bookmarks: Bookmark[];
  practiceHistory: PracticeAttempt[];
  revisionTopicIds: string[];
  settings: AppSettings;
}
