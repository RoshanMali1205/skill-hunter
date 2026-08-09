export type AchievementId =
  | 'first-steps'
  | 'topics-10'
  | 'topics-25'
  | 'topics-50'
  | 'streak-3'
  | 'streak-7'
  | 'streak-14'
  | 'streak-30'
  | 'practice-first'
  | 'practice-25'
  | 'practice-100'
  | 'accuracy-80'
  | 'first-bookmark'
  | 'first-note'
  | 'study-hour'
  | 'profile-photo';

export type AchievementCategory = 'momentum' | 'consistency' | 'practice' | 'identity';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
}

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: string;
}

export interface AchievementsState {
  unlocked: UnlockedAchievement[];
}

export const DEFAULT_ACHIEVEMENTS: AchievementsState = {
  unlocked: [],
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your first topic.',
    icon: 'play',
    category: 'momentum',
  },
  {
    id: 'topics-10',
    title: 'Topic Collector',
    description: 'Complete 10 topics.',
    icon: 'book-open',
    category: 'momentum',
  },
  {
    id: 'topics-25',
    title: 'Deep Dive',
    description: 'Complete 25 topics.',
    icon: 'book-open',
    category: 'momentum',
  },
  {
    id: 'topics-50',
    title: 'Interview Ready',
    description: 'Complete 50 topics.',
    icon: 'target',
    category: 'momentum',
  },
  {
    id: 'streak-3',
    title: 'Warming Up',
    description: 'Study 3 days in a row.',
    icon: 'flame',
    category: 'consistency',
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Keep a 7-day study streak.',
    icon: 'flame',
    category: 'consistency',
  },
  {
    id: 'streak-14',
    title: 'Two-Week Focus',
    description: 'Keep a 14-day study streak.',
    icon: 'calendar',
    category: 'consistency',
  },
  {
    id: 'streak-30',
    title: 'Monthly Momentum',
    description: 'Keep a 30-day study streak.',
    icon: 'trophy',
    category: 'consistency',
  },
  {
    id: 'practice-first',
    title: 'First Attempt',
    description: 'Answer your first practice question.',
    icon: 'target',
    category: 'practice',
  },
  {
    id: 'practice-25',
    title: 'Practice Habit',
    description: 'Attempt 25 practice questions.',
    icon: 'target',
    category: 'practice',
  },
  {
    id: 'practice-100',
    title: 'Century Club',
    description: 'Attempt 100 practice questions.',
    icon: 'trophy',
    category: 'practice',
  },
  {
    id: 'accuracy-80',
    title: 'Sharp Shooter',
    description: 'Reach 80% accuracy with at least 10 attempts.',
    icon: 'thumbs-up',
    category: 'practice',
  },
  {
    id: 'first-bookmark',
    title: 'Saved for Later',
    description: 'Bookmark your first topic or question.',
    icon: 'bookmark',
    category: 'momentum',
  },
  {
    id: 'first-note',
    title: 'Note Taker',
    description: 'Write your first study note.',
    icon: 'pencil',
    category: 'momentum',
  },
  {
    id: 'study-hour',
    title: 'One Solid Hour',
    description: 'Log 60 minutes of total study time.',
    icon: 'clock',
    category: 'consistency',
  },
  {
    id: 'profile-photo',
    title: 'Face of Progress',
    description: 'Add a profile photo to your hunter card.',
    icon: 'user',
    category: 'identity',
  },
];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  momentum: 'Momentum',
  consistency: 'Consistency',
  practice: 'Practice',
  identity: 'Identity',
};
