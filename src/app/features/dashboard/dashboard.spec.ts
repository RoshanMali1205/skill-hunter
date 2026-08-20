import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Bookmark, Subject, TopicProgress } from '../../core/models';
import { AchievementsService } from '../../core/services/achievements.service';
import { ActivityService } from '../../core/services/activity.service';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ContentService } from '../../core/services/content.service';
import { MetricsService } from '../../core/services/metrics.service';
import { ProfileService } from '../../core/services/profile.service';
import { ProgressStore } from '../../core/services/progress.store';
import { DashboardComponent } from './dashboard';

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [
    {
      id: 'modern',
      subjectId: 'angular',
      title: 'Modern',
      order: 1,
      topics: [
        {
          id: 'signals',
          categoryId: 'modern',
          title: 'Signals',
          description: '',
          difficulty: 'beginner',
          interviewPriority: 'high',
          tags: [],
        },
        {
          id: 'defer',
          categoryId: 'modern',
          title: 'Defer',
          description: '',
          difficulty: 'advanced',
          interviewPriority: 'medium',
          tags: [],
        },
      ],
    },
  ],
};
const progressValue: Record<string, TopicProgress> = {
  signals: {
    topicId: 'signals',
    subjectId: 'angular',
    status: 'completed',
    completedBlockIds: [],
    confidence: 'high',
    revisionCount: 2,
    lastVisitedAt: '2026-08-20',
  },
};
const bookmark: Bookmark = {
  id: 'topic-signals',
  entityId: 'signals',
  entityType: 'topic',
  subjectId: 'angular',
  topicId: 'signals',
  createdAt: '2026-08-20',
};

describe('DashboardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ContentService, useValue: { getSubjects: () => of([subject]) } },
        {
          provide: ProgressStore,
          useValue: {
            progress: signal(progressValue),
            recentlyVisited: signal([progressValue['signals']!]),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            computeDashboardMetrics: () => ({
              totalTopics: 2,
              completedTopics: 1,
              inProgressTopics: 0,
              completionPercentage: 50,
              bookmarkedTopics: 1,
              revisionTopics: 0,
              questionsAttempted: 0,
              correctAnswers: 0,
              practiceAccuracy: 0,
            }),
            computeSubjectMetrics: () => ({
              subject,
              completed: 1,
              total: 2,
              percentage: 50,
              categories: [
                { category: subject.categories[0], completed: 1, total: 2, percentage: 50 },
              ],
            }),
            computeWeakTopics: () => [
              {
                topic: subject.categories[0]!.topics[1],
                subjectId: 'angular',
                reasons: ['Low confidence'],
              },
            ],
          },
        },
        { provide: BookmarkService, useValue: { bookmarks: signal([bookmark]) } },
        {
          provide: ActivityService,
          useValue: { currentStreak: signal(3), todayMinutes: signal(20) },
        },
        {
          provide: ProfileService,
          useValue: {
            displayName: signal('Ada'),
            firstName: signal('Ada'),
            photoDataUrl: signal(null),
          },
        },
        {
          provide: AchievementsService,
          useValue: { unlockedCount: signal(2), totalCount: 10, recentlyUnlocked: signal([]) },
        },
      ],
    });
  });

  function create() {
    return TestBed.createComponent(DashboardComponent).componentInstance;
  }

  it('computes status and difficulty chart data', () => {
    const component = create();
    expect(component.statusSegments().map((item) => item.value)).toEqual([1, 0, 1]);
    expect(component.difficultyRows()).toEqual([
      expect.objectContaining({ label: 'Beginner', value: 1, total: 1 }),
      expect.objectContaining({ label: 'Intermediate', value: 0, total: 0 }),
      expect.objectContaining({ label: 'Advanced', value: 0, total: 1 }),
    ]);
  });

  it('resolves recent learning and bookmark references', () => {
    const component = create();
    expect(component.continueLearning()).toMatchObject({
      subjectId: 'angular',
      topic: { id: 'signals' },
    });
    expect(component.recentBookmarks()[0]).toMatchObject({
      resolved: { subjectId: 'angular', topic: { id: 'signals' } },
    });
    expect(component.recentlyStudied()[0]).toMatchObject({
      resolved: { topic: { id: 'signals' } },
    });
  });

  it('orders revised topics and limits weak topics', () => {
    const component = create();
    expect(component.mostRevisedTopics()[0]!.progress.revisionCount).toBe(2);
    expect(component.weakTopics()[0]!.topic.id).toBe('defer');
  });
});
