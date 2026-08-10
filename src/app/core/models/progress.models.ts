import type { UserProfile } from './profile.models';
import type { AchievementsState } from './achievements.models';

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

export interface Note {
  topicId: string;
  subjectId: string;
  content: string;
  updatedAt: string;
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

export type ColorTheme =
  | 'ocean'
  | 'forest'
  | 'ember'
  | 'sunset'
  | 'blush'
  | 'pearl'
  | 'midnight';

export interface AppSettings {
  theme: 'light' | 'dark';
  /** Accent / brand color family. Independent of light/dark. */
  colorTheme: ColorTheme;
  defaultDifficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
  showAnswersAutomatically: boolean;
  dailyGoalMinutes: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  colorTheme: 'ocean',
  defaultDifficulty: 'all',
  showAnswersAutomatically: false,
  dailyGoalMinutes: 20,
};

/** Seconds of active study time, keyed by local date ("YYYY-MM-DD"). */
export type ActivityLog = Record<string, number>;

export interface StoredApplicationData {
  version: number;
  progress: Record<string, TopicProgress>;
  bookmarks: Bookmark[];
  practiceHistory: PracticeAttempt[];
  revisionTopicIds: string[];
  settings: AppSettings;
  activity?: ActivityLog;
  notes?: Record<string, Note>;
  profile?: UserProfile;
  achievements?: AchievementsState;
}
