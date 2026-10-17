import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Bookmark, Topic, TopicProgress } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { BookmarksComponent } from './bookmarks';

const topic: Topic = {
  id: 'signals',
  subjectId: 'angular',
  categoryId: 'modern',
  title: 'Signals',
  description: 'Reactive values',
  difficulty: 'beginner',
  interviewPriority: 'high',
  tags: [],
  blocks: [
    { id: 'concept', type: 'concept', order: 1, content: 'Intro' },
    {
      id: 'q-closure',
      type: 'tricky-question',
      order: 2,
      question: 'What closes over what?',
      answer: 'The scope',
      explanation: '',
    },
  ],
};

describe('BookmarksComponent', () => {
  const bookmarks = signal<Bookmark[]>([]);
  const progress = signal<Record<string, TopicProgress>>({});
  const toggleTopicBookmark = vi.fn();
  const toggleQuestionBookmark = vi.fn();

  beforeEach(() => {
    bookmarks.set([
      {
        id: 'topic-signals',
        entityId: 'signals',
        entityType: 'topic',
        subjectId: 'angular',
        topicId: 'signals',
        createdAt: '',
      },
      {
        id: 'missing-topic',
        entityId: 'gone',
        entityType: 'topic',
        subjectId: 'angular',
        topicId: 'gone',
        createdAt: '',
      },
      {
        id: 'question-closure',
        entityId: 'q-closure',
        entityType: 'question',
        subjectId: 'angular',
        topicId: 'signals',
        createdAt: '',
      },
      {
        id: 'missing-question',
        entityId: 'nope',
        entityType: 'question',
        subjectId: 'angular',
        topicId: 'signals',
        createdAt: '',
      },
    ]);
    progress.set({
      signals: {
        topicId: 'signals',
        subjectId: 'angular',
        status: 'in-progress',
        completedBlockIds: [],
        confidence: 'medium',
        revisionCount: 0,
      },
    });
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [BookmarksComponent],
      providers: [
        provideRouter([]),
        { provide: ContentService, useValue: { getSubjectTopics: () => of([topic]) } },
        {
          provide: BookmarkService,
          useValue: { bookmarks, toggleTopicBookmark, toggleQuestionBookmark },
        },
        { provide: ProgressStore, useValue: { progress } },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(BookmarksComponent);
    TestBed.flushEffects();
    fixture.detectChanges();
    return fixture;
  }

  it('resolves saved topics and questions and drops ones the content no longer has', () => {
    const component = create().componentInstance;
    expect(component.topicBookmarks().map((item) => item.id)).toEqual(['signals']);
    expect(component.questionBookmarks()).toEqual([
      expect.objectContaining({
        topicId: 'signals',
        topicTitle: 'Signals',
        subjectId: 'angular',
        question: expect.objectContaining({ id: 'q-closure' }),
      }),
    ]);
  });

  it('reads progress status and removes bookmarks through the bookmark service', () => {
    const component = create().componentInstance;
    expect(component.statusFor('signals')).toBe('in-progress');
    expect(component.statusFor('missing')).toBe('not-started');

    component.removeTopicBookmark('signals', 'angular');
    component.removeQuestionBookmark('q-closure', 'signals', 'angular');
    expect(toggleTopicBookmark).toHaveBeenCalledWith('signals', 'angular');
    expect(toggleQuestionBookmark).toHaveBeenCalledWith('q-closure', 'signals', 'angular');
  });

  it('shows empty states when nothing is saved', () => {
    bookmarks.set([]);
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('No bookmarked topics yet');
    expect(fixture.nativeElement.textContent).toContain('No bookmarked questions yet');
  });
});
