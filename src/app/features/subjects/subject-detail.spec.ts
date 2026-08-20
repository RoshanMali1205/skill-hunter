import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, TopicProgress } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ContentService } from '../../core/services/content.service';
import { MetricsService } from '../../core/services/metrics.service';
import { ProgressStore } from '../../core/services/progress.store';
import { SubjectDetailComponent } from './subject-detail';

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
          description: 'Reactive values',
          difficulty: 'beginner',
          interviewPriority: 'high',
          tags: ['reactivity'],
        },
        {
          id: 'defer',
          categoryId: 'modern',
          title: 'Deferrable Views',
          description: 'Lazy UI',
          difficulty: 'advanced',
          interviewPriority: 'medium',
          tags: ['performance'],
        },
      ],
    },
  ],
};

describe('SubjectDetailComponent', () => {
  const progress = signal<Record<string, TopicProgress>>({
    signals: {
      topicId: 'signals',
      subjectId: 'angular',
      status: 'completed',
      completedBlockIds: [],
      confidence: 'high',
      revisionCount: 0,
    },
  });
  const bookmarkedTopicIds = signal(new Set(['signals']));
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubjectDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ContentService, useValue: { getSubject: () => of(subject) } },
        { provide: ProgressStore, useValue: { progress } },
        {
          provide: BookmarkService,
          useValue: {
            bookmarkedTopicIds,
            isTopicBookmarked: (id: string) => bookmarkedTopicIds().has(id),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            computeSubjectMetrics: () => ({
              subject,
              completed: 1,
              total: 2,
              percentage: 50,
              categories: [],
            }),
          },
        },
        { provide: Location, useValue: { back: vi.fn() } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function create() {
    const fixture = TestBed.createComponent(SubjectDetailComponent);
    fixture.componentRef.setInput('subjectId', 'angular');
    TestBed.flushEffects();
    return fixture.componentInstance;
  }

  it('filters topics by difficulty, bookmark, and text', () => {
    const component = create();
    component.filter.set({ difficulty: 'beginner', bookmarked: true, searchTerm: 'reactivity' });
    expect(component.filteredCategories()[0]!.topics.map((item) => item.id)).toEqual(['signals']);
    component.filter.set({ difficulty: 'advanced' });
    expect(component.filteredCategories()[0]!.topics.map((item) => item.id)).toEqual(['defer']);
  });

  it('reports active filters, statuses, and completion', () => {
    const component = create();
    component.filter.set({ status: 'completed' });
    expect(component.hasActiveFilter()).toBe(true);
    expect(component.statusFor('signals')).toBe('completed');
    expect(component.statusFor('defer')).toBe('not-started');
    expect(component.categoryCompletion(subject.categories[0]!)).toEqual({
      completed: 1,
      total: 2,
      percentage: 50,
    });
  });

  it('toggles category expansion while filters force categories open', () => {
    const component = create();
    expect(component.isCategoryOpen('modern')).toBe(false);
    component.toggleCategory('modern');
    expect(component.isCategoryOpen('modern')).toBe(true);
    component.toggleCategory('modern');
    expect(component.isCategoryOpen('modern')).toBe(false);
    component.filter.set({ searchTerm: 'signals' });
    expect(component.isCategoryOpen('modern')).toBe(true);
  });

  it('falls back to the subject list when navigating back', () => {
    create().goBack();
    expect(navigate).toHaveBeenCalledWith(['/subjects']);
  });
});
