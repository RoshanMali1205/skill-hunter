import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { NoteService } from '../../core/services/note.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { NoteEditorComponent } from '../../shared/components/note-editor/note-editor';
import { SelectComponent } from '../../shared/components/select/select';
import { SelectOption } from '../../shared/components/select/select.models';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

interface TopicRef {
  topicId: string;
  topicTitle: string;
  subjectId: string;
  subjectTitle: string;
}

@Component({
  selector: 'app-notes',
  imports: [RouterLink, EmptyStateComponent, NoteEditorComponent, MarkdownPipe, SelectComponent],
  templateUrl: './notes.html',
  styleUrl: './notes.scss',
})
export class NotesComponent {
  private readonly contentService = inject(ContentService);
  private readonly noteService = inject(NoteService);

  readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  private readonly topicRefs = computed<TopicRef[]>(() => {
    const refs: TopicRef[] = [];
    for (const subject of this.subjects()) {
      for (const category of subject.categories) {
        for (const topic of category.topics) {
          refs.push({
            topicId: topic.id,
            topicTitle: topic.title,
            subjectId: subject.id,
            subjectTitle: subject.title,
          });
        }
      }
    }
    return refs;
  });

  private readonly topicRefById = computed(() => new Map(this.topicRefs().map((r) => [r.topicId, r])));

  private readonly noteList = computed(() =>
    Object.values(this.noteService.notes()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );

  readonly notesWithTopics = computed(() => {
    const byId = this.topicRefById();
    return this.noteList()
      .map((note) => {
        const ref = byId.get(note.topicId);
        return ref ? { note, ref } : undefined;
      })
      .filter((item): item is NonNullable<typeof item> => !!item);
  });

  // "Add Note" topic picker
  readonly pickerOpen = signal(false);
  readonly pickerSubjectId = signal('');
  readonly pickerTopicId = signal('');

  readonly pickerTopics = computed(() =>
    this.topicRefs().filter((ref) => ref.subjectId === this.pickerSubjectId()),
  );

  readonly subjectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a subject…' },
    ...this.subjects().map((s) => ({ value: s.id, label: s.title })),
  ]);

  readonly topicOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a topic…' },
    ...this.pickerTopics().map((t) => ({ value: t.topicId, label: t.topicTitle })),
  ]);

  // Currently open note editor (accordion-style — one at a time)
  readonly editingTopicId = signal<string | null>(null);

  readonly editingRef = computed(() => {
    const topicId = this.editingTopicId();
    return topicId ? (this.topicRefById().get(topicId) ?? null) : null;
  });

  readonly editingContent = computed(() => this.noteService.getNote(this.editingTopicId() ?? '')?.content ?? '');
  readonly editingUpdatedAt = computed(() => this.noteService.getNote(this.editingTopicId() ?? '')?.updatedAt);

  openPicker(): void {
    this.pickerOpen.set(true);
    this.pickerSubjectId.set('');
    this.pickerTopicId.set('');
  }

  closePicker(): void {
    this.pickerOpen.set(false);
  }

  onPickerSubjectChange(subjectId: string): void {
    this.pickerSubjectId.set(subjectId);
    this.pickerTopicId.set('');
  }

  startPickedNote(): void {
    if (!this.pickerTopicId()) return;
    this.editingTopicId.set(this.pickerTopicId());
    this.closePicker();
  }

  openNote(topicId: string): void {
    this.editingTopicId.set(topicId);
  }

  closeEditor(): void {
    this.editingTopicId.set(null);
  }

  saveEditing(content: string): void {
    const ref = this.editingRef();
    if (!ref) return;
    this.noteService.saveNote(ref.topicId, ref.subjectId, content);
    this.closeEditor();
  }

  deleteEditing(): void {
    const ref = this.editingRef();
    if (!ref) return;
    this.noteService.deleteNote(ref.topicId);
    this.closeEditor();
  }

  formattedDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
