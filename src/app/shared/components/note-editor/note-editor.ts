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
  /** Shown when Close is pressed while there are unsaved changes. */
  readonly confirmingClose = signal(false);

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

  /** Closing with unsaved changes asks first, so a note is never lost by accident. */
  requestClose(): void {
    if (this.isDirty()) {
      this.confirmingClose.set(true);
      return;
    }
    this.closed.emit();
  }

  saveAndClose(): void {
    this.saved.emit(this.draft());
    this.confirmingClose.set(false);
    this.closed.emit();
  }

  discardAndClose(): void {
    this.confirmingClose.set(false);
    this.closed.emit();
  }

  keepEditing(): void {
    this.confirmingClose.set(false);
    this.showPreview.set(false);
  }

  delete(): void {
    this.deleted.emit();
  }
}
