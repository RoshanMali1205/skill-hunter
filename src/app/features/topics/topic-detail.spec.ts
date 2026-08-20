import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, Subject, Topic } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ContentService } from '../../core/services/content.service';
import { NoteService } from '../../core/services/note.service';
import { ProgressStore } from '../../core/services/progress.store';
import { RevisionService } from '../../core/services/revision.service';
import { SettingsService } from '../../core/services/settings.service';
import { TextToSpeechService } from '../../core/services/text-to-speech.service';
import { TopicExportService } from '../../core/services/topic-export.service';
import { TopicDetailComponent } from './topic-detail';

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [{ id: 'modern', subjectId: 'angular', title: 'Modern', order: 1, topics: [] }],
};
const topic: Topic = {
  id: 'signals',
  categoryId: 'modern',
  subjectId: 'angular',
  title: 'Signals',
  description: '**Reactive** state',
  difficulty: 'beginner',
  interviewPriority: 'high',
  tags: [],
  blocks: [
    { id: 'second', type: 'summary', order: 2, content: 'Summary' },
    {
      id: 'first',
      type: 'concept',
      order: 1,
      title: 'Core',
      content: 'A signal stores a value.',
      keyPoints: ['Tracks consumers'],
    },
  ],
};

describe('TopicDetailComponent', () => {
  const markComplete = vi.fn();
  const markIncomplete = vi.fn();
  const setConfidence = vi.fn();
  const toggleTopicBookmark = vi.fn();
  const toggleQuestionBookmark = vi.fn();
  const toggleRevision = vi.fn();
  const saveNote = vi.fn();
  const deleteNote = vi.fn();
  const ttsToggle = vi.fn();
  let navigate: ReturnType<typeof vi.spyOn>;
  const exportTopics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    exportTopics.mockResolvedValue({ ok: true });
    TestBed.configureTestingModule({
      imports: [TopicDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ContentService,
          useValue: { getSubject: () => of(subject), getTopic: () => of(topic) },
        },
        {
          provide: ProgressStore,
          useValue: {
            getTopicProgress: () => ({
              topicId: 'signals',
              subjectId: 'angular',
              status: 'in-progress',
              completedBlockIds: [],
              confidence: 'medium',
              revisionCount: 0,
            }),
            touchLastVisited: vi.fn(),
            markComplete,
            markIncomplete,
            setConfidence,
          },
        },
        {
          provide: BookmarkService,
          useValue: {
            isTopicBookmarked: () => false,
            toggleTopicBookmark,
            isQuestionBookmarked: () => false,
            toggleQuestionBookmark,
          },
        },
        { provide: RevisionService, useValue: { isInRevision: () => false, toggleRevision } },
        { provide: SettingsService, useValue: { settings: signal(DEFAULT_SETTINGS) } },
        {
          provide: NoteService,
          useValue: {
            getNote: () => ({
              topicId: 'signals',
              subjectId: 'angular',
              content: 'Note',
              updatedAt: '',
            }),
            saveNote,
            deleteNote,
          },
        },
        {
          provide: TextToSpeechService,
          useValue: { supported: true, speakingId: signal(null), stop: vi.fn(), toggle: ttsToggle },
        },
        { provide: TopicExportService, useValue: { exportTopics } },
        { provide: Location, useValue: { back: vi.fn() } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function create() {
    const fixture = TestBed.createComponent(TopicDetailComponent);
    fixture.componentRef.setInput('subjectId', 'angular');
    fixture.componentRef.setInput('topicId', 'signals');
    TestBed.flushEffects();
    return fixture.componentInstance;
  }

  it('loads context, sorts blocks, and creates readable study text', () => {
    const component = create();
    expect(component.category()?.title).toBe('Modern');
    expect(component.sortedBlocks().map((block) => block.id)).toEqual(['first', 'second']);
    expect(component.readableText()).toContain('Reactive state');
    expect(component.readableText()).toContain('Tracks consumers');
  });

  it('delegates progress, bookmark, revision, and speech actions', () => {
    const component = create();
    component.toggleComplete();
    component.setConfidence('high');
    component.toggleBookmark();
    component.toggleQuestionBookmark('q1');
    component.toggleRevision();
    component.toggleReadAloud();
    expect(markComplete).toHaveBeenCalledWith('signals', 'angular');
    expect(setConfidence).toHaveBeenCalledWith('signals', 'angular', 'high');
    expect(toggleTopicBookmark).toHaveBeenCalledWith('signals', 'angular');
    expect(toggleQuestionBookmark).toHaveBeenCalledWith('q1', 'signals', 'angular');
    expect(toggleRevision).toHaveBeenCalledWith('signals');
    expect(ttsToggle).toHaveBeenCalledWith('signals', expect.stringContaining('signal stores'));
  });

  it('saves and deletes notes while closing the editor', () => {
    const component = create();
    component.noteEditorOpen.set(true);
    component.saveNote('Updated');
    expect(saveNote).toHaveBeenCalledWith('signals', 'angular', 'Updated');
    expect(component.noteEditorOpen()).toBe(false);
    component.noteEditorOpen.set(true);
    component.deleteNote();
    expect(deleteNote).toHaveBeenCalledWith('signals');
    expect(component.noteEditorOpen()).toBe(false);
  });

  it('exports the topic with notes and reports success', async () => {
    const component = create();
    await component.exportTopicPdf();
    expect(exportTopics).toHaveBeenCalledWith(
      [{ subjectId: 'angular', topicId: 'signals' }],
      expect.objectContaining({ includeNotes: true }),
    );
    expect(component.exporting()).toBe(false);
    expect(component.exportMessage()?.success).toBe(true);
  });

  it('navigates to practice and AI mentor with topic context', () => {
    const component = create();
    component.practiceAgain();
    component.askAi();
    expect(navigate).toHaveBeenCalledWith(['/practice'], { queryParams: { topicId: 'signals' } });
    expect(navigate).toHaveBeenCalledWith(['/ai-mentor'], {
      queryParams: expect.objectContaining({
        subjectId: 'angular',
        topicId: 'signals',
        topic: 'Signals',
      }),
    });
  });
});
