import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';

@Injectable({ providedIn: 'root' })
export class RevisionService {
  private readonly storage = inject(StorageService);

  private readonly _revisionTopicIds = signal<string[]>(
    this.storage.get(STORAGE_KEYS.revisionList, []),
  );

  readonly revisionTopicIds = this._revisionTopicIds.asReadonly();

  isInRevision(topicId: string): boolean {
    return this._revisionTopicIds().includes(topicId);
  }

  addToRevision(topicId: string): void {
    if (this.isInRevision(topicId)) return;
    this._revisionTopicIds.update((ids) => [...ids, topicId]);
    this.persist();
  }

  removeFromRevision(topicId: string): void {
    this._revisionTopicIds.update((ids) => ids.filter((id) => id !== topicId));
    this.persist();
  }

  toggleRevision(topicId: string): void {
    if (this.isInRevision(topicId)) {
      this.removeFromRevision(topicId);
    } else {
      this.addToRevision(topicId);
    }
  }

  replaceAll(topicIds: string[]): void {
    this._revisionTopicIds.set(topicIds);
    this.persist();
  }

  resetAll(): void {
    this._revisionTopicIds.set([]);
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.revisionList, this._revisionTopicIds());
  }
}
