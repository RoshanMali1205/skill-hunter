import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { Note } from '../models';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly storage = inject(StorageService);

  private readonly _notes = signal<Record<string, Note>>(
    this.storage.get(STORAGE_KEYS.notes, {}),
  );

  readonly notes = this._notes.asReadonly();

  readonly noteCount = computed(() => Object.keys(this._notes()).length);

  getNote(topicId: string): Note | undefined {
    return this._notes()[topicId];
  }

  hasNote(topicId: string): boolean {
    return !!this._notes()[topicId];
  }

  saveNote(topicId: string, subjectId: string, content: string): void {
    if (!content.trim()) {
      this.deleteNote(topicId);
      return;
    }
    this._notes.update((all) => ({
      ...all,
      [topicId]: { topicId, subjectId, content, updatedAt: new Date().toISOString() },
    }));
    this.persist();
  }

  appendToNote(topicId: string, subjectId: string, addition: string): void {
    const existing = this.getNote(topicId)?.content.trim();
    const content = existing ? `${existing}\n\n---\n\n${addition}` : addition;
    this.saveNote(topicId, subjectId, content);
  }

  deleteNote(topicId: string): void {
    this._notes.update((all) => {
      if (!(topicId in all)) return all;
      const rest = { ...all };
      delete rest[topicId];
      return rest;
    });
    this.persist();
  }

  replaceAll(notes: Record<string, Note>): void {
    this._notes.set(notes);
    this.persist();
  }

  resetAll(): void {
    this._notes.set({});
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.notes, this._notes());
  }
}
