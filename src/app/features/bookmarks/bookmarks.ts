import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ProgressStore } from '../../core/services/progress.store';
import { QuestionBlock } from '../../core/models';
import { TopicCardComponent } from '../../shared/components/topic-card/topic-card';
import { QuestionCardComponent } from '../../shared/components/question-card/question-card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-bookmarks',
  imports: [TopicCardComponent, QuestionCardComponent, EmptyStateComponent],
  templateUrl: './bookmarks.html',
  styleUrl: './bookmarks.scss',
})
export class BookmarksComponent {
  private readonly contentService = inject(ContentService);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly progressStore = inject(ProgressStore);

  readonly bookmarks = this.bookmarkService.bookmarks;

  private readonly relevantSubjectIds = computed(
    () => [...new Set(this.bookmarks().map((b) => b.subjectId))],
  );

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

  readonly topicBookmarks = computed(() => {
    const topics = this.loadedTopics();
    return this.bookmarks()
      .filter((b) => b.entityType === 'topic')
      .map((b) => topics.find((t) => t.id === b.entityId))
      .filter((t): t is NonNullable<typeof t> => !!t);
  });

  readonly questionBookmarks = computed(() => {
    const topics = this.loadedTopics();
    const results: { question: QuestionBlock; topicId: string; topicTitle: string; subjectId: string }[] = [];

    for (const bookmark of this.bookmarks().filter((b) => b.entityType === 'question')) {
      const topic = topics.find((t) => t.id === bookmark.topicId);
      const question = topic?.blocks.find(
        (b): b is QuestionBlock => b.id === bookmark.entityId && 'question' in b,
      );
      if (topic && question) {
        results.push({
          question,
          topicId: topic.id,
          topicTitle: topic.title,
          subjectId: topic.subjectId,
        });
      }
    }

    return results;
  });

  statusFor(topicId: string) {
    return this.progressStore.progress()[topicId]?.status ?? 'not-started';
  }

  removeTopicBookmark(topicId: string, subjectId: string): void {
    this.bookmarkService.toggleTopicBookmark(topicId, subjectId);
  }

  removeQuestionBookmark(questionId: string, topicId: string, subjectId: string): void {
    this.bookmarkService.toggleQuestionBookmark(questionId, topicId, subjectId);
  }
}
