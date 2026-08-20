import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, Subject, Topic } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ContentService } from '../../core/services/content.service';
import { PracticeService } from '../../core/services/practice.service';
import { ProgressStore } from '../../core/services/progress.store';
import { RevisionService } from '../../core/services/revision.service';
import { SettingsService } from '../../core/services/settings.service';
import { PracticeComponent } from './practice';

const question = {
  id: 'q1',
  type: 'interview-question' as const,
  order: 1,
  question: 'Why?',
  answer: 'A',
  explanation: '',
};
const topic: Topic = {
  id: 'signals',
  categoryId: 'modern',
  subjectId: 'angular',
  title: 'Signals',
  description: '',
  difficulty: 'beginner',
  interviewPriority: 'high',
  tags: [],
  blocks: [question],
};
const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [{ id: 'modern', subjectId: 'angular', title: 'Modern', order: 1, topics: [topic] }],
};
const pool = [
  {
    block: question,
    topicId: 'signals',
    topicTitle: 'Signals',
    subjectId: 'angular',
    difficulty: 'beginner' as const,
  },
];

describe('PracticeComponent', () => {
  const recordAttempt = vi.fn();
  const addToRevision = vi.fn();
  const toggleQuestionBookmark = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [PracticeComponent],
      providers: [
        {
          provide: ContentService,
          useValue: { getSubjects: () => of([subject]), getSubjectTopics: () => of([topic]) },
        },
        { provide: ProgressStore, useValue: { lowConfidenceTopicIds: signal(['signals']) } },
        {
          provide: BookmarkService,
          useValue: {
            bookmarkedQuestionIds: signal(new Set<string>()),
            isQuestionBookmarked: () => false,
            toggleQuestionBookmark,
          },
        },
        {
          provide: PracticeService,
          useValue: {
            incorrectTopicIds: signal(new Set<string>()),
            buildQuestionPool: () => pool,
            recordAttempt,
          },
        },
        {
          provide: RevisionService,
          useValue: { revisionTopicIds: signal<string[]>([]), addToRevision },
        },
        { provide: SettingsService, useValue: { settings: signal(DEFAULT_SETTINGS) } },
        { provide: Location, useValue: { back: vi.fn() } },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  function create() {
    return TestBed.createComponent(PracticeComponent).componentInstance;
  }

  it('builds filter options and preview counts from loaded content', () => {
    const component = create();
    expect(component.subjectOptions()).toContainEqual({ value: 'angular', label: 'Angular' });
    component.updateFilter({ subjectId: 'angular' });
    expect(component.categoryOptions()).toContainEqual({ value: 'modern', label: 'Modern' });
    expect(component.previewCount()).toBe(1);
    expect(component.weakTopicIds()).toEqual(new Set(['signals']));
  });

  it('clears a locked topic when subject/category filters change', () => {
    const component = create();
    component.filter.update((current) => ({ ...current, topicId: 'signals' }));
    component.updateFilter({ categoryId: 'modern' });
    expect(component.filter().topicId).toBeUndefined();
  });

  it('starts, assesses, and completes a practice session', () => {
    const component = create();
    component.startPractice();
    expect(component.started()).toBe(true);
    expect(component.currentQuestion()?.block.id).toBe('q1');

    component.onAssessed('incorrect');
    expect(recordAttempt).toHaveBeenCalledWith('q1', 'signals', 'angular', 'incorrect');
    expect(addToRevision).toHaveBeenCalledWith('signals');
    expect(component.sessionResults()).toEqual({ correct: 0, incorrect: 1, needsRevision: 0 });
    expect(component.sessionComplete()).toBe(true);
  });

  it('restarts and delegates bookmark actions', () => {
    const component = create();
    component.startPractice();
    component.restart();
    expect(component.started()).toBe(false);
    expect(component.pool()).toEqual([]);
    component.toggleQuestionBookmark('q1', 'signals', 'angular');
    expect(toggleQuestionBookmark).toHaveBeenCalledWith('q1', 'signals', 'angular');
  });

  it('falls back to dashboard navigation without topic context', () => {
    create().goBack();
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
