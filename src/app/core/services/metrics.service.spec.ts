import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Subject, TopicProgress } from '../models';
import { BookmarkService } from './bookmark.service';
import { MetricsService } from './metrics.service';
import { PracticeService } from './practice.service';
import { ProgressStore } from './progress.store';
import { RevisionService } from './revision.service';

const subjects: Subject[] = [
  {
    id: 'angular',
    title: 'Angular',
    description: '',
    icon: '',
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
            id: 'control-flow',
            categoryId: 'modern',
            title: 'Control Flow',
            description: '',
            difficulty: 'intermediate',
            interviewPriority: 'medium',
            tags: [],
          },
        ],
      },
    ],
  },
];

describe('MetricsService', () => {
  const progress = signal<Record<string, TopicProgress>>({});
  const lowConfidenceTopicIds = signal<string[]>([]);
  const incorrectTopicIds = signal(new Set<string>());
  const revisionTopicIds = signal<string[]>([]);
  const bookmarkedTopicIds = signal(new Set<string>());

  let service: MetricsService;

  beforeEach(() => {
    progress.set({});
    lowConfidenceTopicIds.set([]);
    incorrectTopicIds.set(new Set());
    revisionTopicIds.set([]);
    bookmarkedTopicIds.set(new Set());
    TestBed.configureTestingModule({
      providers: [
        MetricsService,
        {
          provide: ProgressStore,
          useValue: { progress, lowConfidenceTopicIds, inProgressCount: () => 1 },
        },
        { provide: BookmarkService, useValue: { bookmarkedTopicIds } },
        {
          provide: PracticeService,
          useValue: {
            incorrectTopicIds,
            questionsAttempted: () => 4,
            correctAnswers: () => 3,
            accuracy: () => 75,
          },
        },
        { provide: RevisionService, useValue: { revisionTopicIds } },
      ],
    });
    service = TestBed.inject(MetricsService);
  });

  it('computes category, subject, and dashboard totals', () => {
    progress.set({
      signals: {
        topicId: 'signals',
        subjectId: 'angular',
        status: 'completed',
        completedBlockIds: [],
        confidence: 'high',
        revisionCount: 0,
      },
    });
    bookmarkedTopicIds.set(new Set(['signals']));
    revisionTopicIds.set(['control-flow']);

    expect(service.computeCategoryMetrics(subjects[0]!.categories[0]!)).toMatchObject({
      total: 2,
      completed: 1,
      percentage: 50,
    });
    expect(service.computeSubjectMetrics(subjects[0]!)).toMatchObject({
      total: 2,
      completed: 1,
      percentage: 50,
    });
    expect(service.computeDashboardMetrics(subjects)).toEqual({
      totalTopics: 2,
      completedTopics: 1,
      inProgressTopics: 1,
      completionPercentage: 50,
      bookmarkedTopics: 1,
      revisionTopics: 1,
      questionsAttempted: 4,
      correctAnswers: 3,
      practiceAccuracy: 75,
    });
  });

  it('returns zero percentages for empty content', () => {
    const empty = { ...subjects[0]!.categories[0]!, topics: [] };
    expect(service.computeCategoryMetrics(empty).percentage).toBe(0);
    expect(service.computeDashboardMetrics([]).completionPercentage).toBe(0);
  });

  it('combines every reason a topic is considered weak', () => {
    lowConfidenceTopicIds.set(['signals']);
    incorrectTopicIds.set(new Set(['signals']));
    revisionTopicIds.set(['signals']);
    bookmarkedTopicIds.set(new Set(['signals']));
    expect(service.computeWeakTopics(subjects)).toEqual([
      {
        topic: subjects[0]!.categories[0]!.topics[0],
        subjectId: 'angular',
        reasons: [
          'Low confidence',
          'Incorrect practice attempt',
          'Added to revision',
          'Bookmarked',
        ],
      },
    ]);
  });
});
