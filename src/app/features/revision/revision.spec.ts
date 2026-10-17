import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, TopicProgress } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { MetricsService } from '../../core/services/metrics.service';
import { ProgressStore } from '../../core/services/progress.store';
import { RevisionService } from '../../core/services/revision.service';
import { RevisionComponent } from './revision';

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
      ],
    },
  ],
};

describe('RevisionComponent', () => {
  const progress = signal<Record<string, TopicProgress>>({});
  const manual = signal(new Set<string>(['signals']));
  const incrementRevisionCount = vi.fn();
  const removeFromRevision = vi.fn();
  const computeWeakTopics = vi.fn(() => [
    {
      topic: subject.categories[0]!.topics[0]!,
      subjectId: 'angular',
      reasons: ['Low confidence'],
    },
  ]);

  beforeEach(() => {
    progress.set({});
    manual.set(new Set(['signals']));
    computeWeakTopics.mockReset();
    computeWeakTopics.mockImplementation(() => [
      {
        topic: subject.categories[0]!.topics[0]!,
        subjectId: 'angular',
        reasons: ['Low confidence'],
      },
    ]);
    TestBed.configureTestingModule({
      imports: [RevisionComponent],
      providers: [
        provideRouter([]),
        { provide: ContentService, useValue: { getSubjects: () => of([subject]) } },
        { provide: ProgressStore, useValue: { progress, incrementRevisionCount } },
        {
          provide: RevisionService,
          useValue: { isInRevision: (id: string) => manual().has(id), removeFromRevision },
        },
        { provide: MetricsService, useValue: { computeWeakTopics } },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(RevisionComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('lists weak topics from the loaded subjects', () => {
    const fixture = create();
    expect(computeWeakTopics).toHaveBeenCalledWith([subject]);
    expect(fixture.componentInstance.revisionItems()[0]!.reasons).toEqual(['Low confidence']);
    expect(fixture.nativeElement.textContent).toContain('Low confidence');
    expect(fixture.nativeElement.textContent).toContain('Remove from list');
  });

  it('marks a topic revised and can drop a manual entry', () => {
    const component = create().componentInstance;
    expect(component.statusFor('signals')).toBe('not-started');
    expect(component.isManuallyAdded('signals')).toBe(true);
    expect(component.isManuallyAdded('other')).toBe(false);

    component.completeRevision('signals', 'angular');
    expect(incrementRevisionCount).toHaveBeenCalledWith('signals', 'angular');
    expect(removeFromRevision).toHaveBeenCalledWith('signals');

    component.removeFromRevisionList('signals');
    expect(removeFromRevision).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state when nothing needs revision', () => {
    computeWeakTopics.mockReturnValue([]);
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Nothing to revise right now');
  });
});
