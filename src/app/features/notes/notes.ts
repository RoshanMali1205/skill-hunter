import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { NoteService } from '../../core/services/note.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-notes',
  imports: [RouterLink, EmptyStateComponent, MarkdownPipe],
  templateUrl: './notes.html',
  styleUrl: './notes.scss',
})
export class NotesComponent {
  private readonly contentService = inject(ContentService);
  private readonly noteService = inject(NoteService);

  private readonly noteList = computed(() =>
    Object.values(this.noteService.notes()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );

  private readonly relevantSubjectIds = computed(() => [
    ...new Set(this.noteList().map((note) => note.subjectId)),
  ]);

  private readonly loadedTopics = toSignal(
    toObservable(this.relevantSubjectIds).pipe(
      switchMap((subjectIds) =>
        subjectIds.length === 0
          ? of([])
          : forkJoin(subjectIds.map((id) => this.contentService.getSubjectTopics(id))).pipe(
              map((lists) => lists.flat()),
            ),
      ),
    ),
    { initialValue: [] },
  );

  readonly notesWithTopics = computed(() => {
    const topics = this.loadedTopics();
    return this.noteList()
      .map((note) => {
        const topic = topics.find((t) => t.id === note.topicId);
        return topic ? { note, topic } : undefined;
      })
      .filter((item): item is NonNullable<typeof item> => !!item);
  });

  formattedDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  removeNote(topicId: string): void {
    this.noteService.deleteNote(topicId);
  }
}
