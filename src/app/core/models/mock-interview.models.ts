export type MockRating = 'got-it' | 'partly' | 'missed' | 'skipped';

export interface MockLengthOption {
  id: 'quick' | 'standard' | 'full';
  label: string;
  questions: number;
  minutes: number;
  blurb: string;
}

/** One answered (or skipped) question, kept so a past scorecard can be reopened. */
export interface MockResultItem {
  questionId: string;
  topicId: string;
  rating: MockRating;
  typedAnswer?: string;
}

export interface MockInterviewResult {
  id: string;
  subjectId: string;
  finishedAt: string;
  totalQuestions: number;
  gotIt: number;
  partly: number;
  missed: number;
  skipped: number;
  /** 0–100. A "partly" answer counts as half a point. */
  score: number;
  durationSeconds: number;
  timeLimitSeconds: number;
  timedOut: boolean;
  /** Per-question detail. Missing on results saved by older versions. */
  items?: MockResultItem[];
}

export interface MockGrade {
  title: string;
  message: string;
  tone: 'great' | 'good' | 'ok' | 'low';
}

/** Which questions a mock interview draws from. `all` mixes every level. */
export type MockDifficulty = 'all' | 'beginner' | 'intermediate' | 'advanced';
