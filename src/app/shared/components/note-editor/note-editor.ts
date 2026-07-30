import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-note-editor',
  imports: [FormsModule, MarkdownPipe],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss',
})
export class NoteEditorComponent {
  initialContent = input<string>('');
  updatedAt = input<string | undefined>(undefined);

  saved = output<string>();
  deleted = output<void>();
  closed = output<void>();

  readonly draft = signal('');
  readonly showPreview = signal(false);

  readonly isDirty = computed(() => this.draft() !== this.initialContent());
  readonly hasSavedNote = computed(() => this.initialContent().trim().length > 0);

  readonly formattedUpdatedAt = computed(() => {
    const value = this.updatedAt();
    if (!value) return null;
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  });

  constructor() {
    effect(() => {
      this.draft.set(this.initialContent());
    });
  }

  togglePreview(): void {
    this.showPreview.update((show) => !show);
  }

  save(): void {
    this.saved.emit(this.draft());
  }

  delete(): void {
    this.deleted.emit();
  }
}
