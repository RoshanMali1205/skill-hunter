export type SkillLevel = 'beginner' | 'senior' | 'architect';

export interface SkillTopic {
  id: string;
  title: string;
  subject: string;
  level: SkillLevel;
  summary: string;
}

export const skillLevels = ['beginner', 'senior', 'architect'] as const;

export const topics: readonly SkillTopic[] = [
  {
    id: 'angular-onpush',
    title: 'OnPush Change Detection',
    subject: 'Angular',
    level: 'senior',
    summary: 'Use explicit reactive state and stable data flow to reduce unnecessary checking.',
  },
  {
    id: 'standalone-lazy-loading',
    title: 'Standalone Lazy Loading',
    subject: 'Angular',
    level: 'architect',
    summary:
      'Standalone conversion does not automatically make routes lazy. Route boundaries must use lazy loading explicitly.',
  },
  {
    id: 'design-tokens',
    title: 'UI Design Tokens',
    subject: 'UI Architecture',
    level: 'architect',
    summary: 'Central tokens create consistent colour, spacing, typography and theming decisions.',
  },
];
