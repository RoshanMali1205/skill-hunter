import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { Bookmark } from '../models';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly storage = inject(StorageService);

  private readonly _bookmarks = signal<Bookmark[]>(
    this.storage.get(STORAGE_KEYS.bookmarks, []),
  );

  readonly bookmarks = this._bookmarks.asReadonly();

  readonly bookmarkedTopicIds = computed(
    () =>
      new Set(
        this._bookmarks()
          .filter((b) => b.entityType === 'topic')
          .map((b) => b.entityId),
      ),
  );

  readonly bookmarkedQuestionIds = computed(
    () =>
      new Set(
        this._bookmarks()
          .filter((b) => b.entityType === 'question')
          .map((b) => b.entityId),
      ),
  );

  isTopicBookmarked(topicId: string): boolean {
    return this.bookmarkedTopicIds().has(topicId);
  }

  isQuestionBookmarked(questionId: string): boolean {
    return this.bookmarkedQuestionIds().has(questionId);
  }

  toggleTopicBookmark(topicId: string, subjectId: string): void {
    if (this.isTopicBookmarked(topicId)) {
      this.remove(topicId, 'topic');
    } else {
      this.add(topicId, 'topic', subjectId, topicId);
    }
  }

  toggleQuestionBookmark(questionId: string, topicId: string, subjectId: string): void {
    if (this.isQuestionBookmarked(questionId)) {
      this.remove(questionId, 'question');
    } else {
      this.add(questionId, 'question', subjectId, topicId);
    }
  }

  replaceAll(bookmarks: Bookmark[]): void {
    this._bookmarks.set(bookmarks);
    this.persist();
  }

  resetAll(): void {
    this._bookmarks.set([]);
    this.persist();
  }

  private add(
    entityId: string,
    entityType: Bookmark['entityType'],
    subjectId: string,
    topicId: string,
  ): void {
    const bookmark: Bookmark = {
      id: `${entityType}-${entityId}`,
      entityId,
      entityType,
      subjectId,
      topicId,
      createdAt: new Date().toISOString(),
    };
    this._bookmarks.update((all) => [...all, bookmark]);
    this.persist();
  }

  private remove(entityId: string, entityType: Bookmark['entityType']): void {
    this._bookmarks.update((all) =>
      all.filter((b) => !(b.entityId === entityId && b.entityType === entityType)),
    );
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.bookmarks, this._bookmarks());
  }
}
