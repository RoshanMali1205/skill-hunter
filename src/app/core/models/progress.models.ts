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
  | 'indigo'
  | 'violet'
  | 'teal'
  | 'forest'
  | 'ember'
  | 'sunset'
  | 'blush'
  | 'pearl'
  | 'midnight'
  | 'northern'
  | 'glow'
  | 'reef'
  | 'tropical'
  | 'royal'
  | 'berry'
  | 'fjord'
  | 'candy'
  | 'custom';

/** Visual style of the whole interface: how surfaces, depth and borders look. Independent of light/dark and accent color. */
export type UiStyle =
  'classic' | 'glass' | 'neumorphic' | 'spatial' | 'brutalism' | 'aurora' | 'clay';

export const UI_STYLES: readonly UiStyle[] = [
  'classic',
  'glass',
  'neumorphic',
  'spatial',
  'brutalism',
  'aurora',
  'clay',
];

export interface AppSettings {
  theme: 'light' | 'dark';
  /** Accent / brand color family. Independent of light/dark. */
  colorTheme: ColorTheme;
  /** Surface style (flat, frosted glass, soft neumorphic, or layered spatial). */
  uiStyle: UiStyle;
  /** Main color for the 'custom' color theme, as #rrggbb. */
  customPrimary: string;
  /** Optional second color for the 'custom' theme. null means derive it from the main color. */
  customAccent: string | null;
  /** Optional third color for the 'custom' theme. null means derive it. */
  customTertiary: string | null;
  defaultDifficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
  showAnswersAutomatically: boolean;
  dailyGoalMinutes: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  colorTheme: 'ocean',
  uiStyle: 'classic',
  customPrimary: '#0e7490',
  customAccent: null,
  customTertiary: null,
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
