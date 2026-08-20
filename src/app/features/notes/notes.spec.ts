import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Note, Subject } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { NoteService } from '../../core/services/note.service';
import { NotesComponent } from './notes';

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

describe('NotesComponent', () => {
  const notes = signal<Record<string, Note>>({
    signals: {
      topicId: 'signals',
      subjectId: 'angular',
      content: 'Remember',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
    orphan: {
      topicId: 'orphan',
      subjectId: 'angular',
      content: 'Hidden',
      updatedAt: '2026-08-21T00:00:00.000Z',
    },
  });
  const saveNote = vi.fn();
  const deleteNote = vi.fn();
  const getNote = (id: string) => notes()[id];

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [NotesComponent],
      providers: [
        provideRouter([]),
        { provide: ContentService, useValue: { getSubjects: () => of([subject]) } },
        { provide: NoteService, useValue: { notes, getNote, saveNote, deleteNote } },
      ],
    });
  });

  function create() {
    return TestBed.createComponent(NotesComponent).componentInstance;
  }

  it('resolves notes to known topics and omits orphaned notes', () => {
    const component = create();
    expect(component.notesWithTopics()).toHaveLength(1);
    expect(component.notesWithTopics()[0]!.ref.topicTitle).toBe('Signals');
  });

  it('controls the add-note picker and resets topics when subject changes', () => {
    const component = create();
    component.openPicker();
    component.onPickerSubjectChange('angular');
    expect(component.pickerTopics().map((item) => item.topicId)).toEqual(['signals']);
    component.pickerTopicId.set('signals');
    component.startPickedNote();
    expect(component.editingTopicId()).toBe('signals');
    expect(component.pickerOpen()).toBe(false);
  });

  it('saves and deletes the active note', () => {
    const component = create();
    component.openNote('signals');
    component.saveEditing('Updated');
    expect(saveNote).toHaveBeenCalledWith('signals', 'angular', 'Updated');
    expect(component.editingTopicId()).toBeNull();

    component.openNote('signals');
    component.deleteEditing();
    expect(deleteNote).toHaveBeenCalledWith('signals');
  });

  it('formats saved dates for display', () => {
    expect(create().formattedDate('2026-08-20T00:00:00.000Z')).toContain('2026');
  });
});
