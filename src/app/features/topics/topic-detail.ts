import { Component, computed, effect, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, switchMap } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { BookmarkService } from '../../core/services/bookmark.service';
import { RevisionService } from '../../core/services/revision.service';
import { SettingsService } from '../../core/services/settings.service';
import { ConfidenceLevel } from '../../core/models';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';
import { IconComponent } from '../../shared/components/icon/icon';
import { DifficultyChipComponent } from '../../shared/components/difficulty-chip/difficulty-chip';
import { PriorityChipComponent } from '../../shared/components/priority-chip/priority-chip';
import { CodeBlockComponent } from '../../shared/components/code-block/code-block';
import { QuestionCardComponent } from '../../shared/components/question-card/question-card';
import { BookmarkButtonComponent } from '../../shared/components/bookmark-button/bookmark-button';
import { CompletionButtonComponent } from '../../shared/components/completion-button/completion-button';
import { ConfidenceSelectorComponent } from '../../shared/components/confidence-selector/confidence-selector';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-topic-detail',
  imports: [
    RouterLink,
    BreadcrumbComponent,
    IconComponent,
    DifficultyChipComponent,
    PriorityChipComponent,
    CodeBlockComponent,
    QuestionCardComponent,
    BookmarkButtonComponent,
    CompletionButtonComponent,
    ConfidenceSelectorComponent,
    EmptyStateComponent,
  ],
  templateUrl: './topic-detail.html',
  styleUrl: './topic-detail.scss',
})
export class TopicDetailComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly revisionService = inject(RevisionService);
  private readonly settingsService = inject(SettingsService);
  private readonly router = inject(Router);

  readonly settings = this.settingsService.settings;

  subjectId = input.required<string>();
  topicId = input.required<string>();

  readonly subject = toSignal(
    toObservable(this.subjectId).pipe(switchMap((id) => this.contentService.getSubject(id))),
    { initialValue: undefined },
  );

  readonly topic = toSignal(
    combineLatest([toObservable(this.subjectId), toObservable(this.topicId)]).pipe(
      switchMap(([subjectId, topicId]) => this.contentService.getTopic(subjectId, topicId)),
    ),
    { initialValue: undefined },
  );

  readonly sortedBlocks = computed(
    () => [...(this.topic()?.blocks ?? [])].sort((a, b) => a.order - b.order),
  );

  readonly category = computed(() =>
    this.subject()?.categories.find((c) => c.id === this.topic()?.categoryId),
  );

  readonly progress = computed(() =>
    this.progressStore.getTopicProgress(this.topicId(), this.subjectId()),
  );

  readonly isBookmarked = computed(() => this.bookmarkService.isTopicBookmarked(this.topicId()));

  readonly isInRevision = computed(() => this.revisionService.isInRevision(this.topicId()));

  constructor() {
    effect(() => {
      const topicId = this.topicId();
      const subjectId = this.subjectId();
      if (topicId && subjectId) {
        this.progressStore.touchLastVisited(topicId, subjectId);
      }
    });
  }

  toggleComplete(): void {
    if (this.progress().status === 'completed') {
      this.progressStore.markIncomplete(this.topicId(), this.subjectId());
    } else {
      this.progressStore.markComplete(this.topicId(), this.subjectId());
    }
  }

  setConfidence(confidence: ConfidenceLevel): void {
    this.progressStore.setConfidence(this.topicId(), this.subjectId(), confidence);
  }

  toggleBookmark(): void {
    this.bookmarkService.toggleTopicBookmark(this.topicId(), this.subjectId());
  }

  isQuestionBookmarked(questionId: string): boolean {
    return this.bookmarkService.isQuestionBookmarked(questionId);
  }

  toggleQuestionBookmark(questionId: string): void {
    this.bookmarkService.toggleQuestionBookmark(questionId, this.topicId(), this.subjectId());
  }

  toggleRevision(): void {
    this.revisionService.toggleRevision(this.topicId());
  }

  practiceAgain(): void {
    this.router.navigate(['/practice'], { queryParams: { topicId: this.topicId() } });
  }

  askAi(): void {
    this.router.navigate(['/ai-mentor'], {
      queryParams: { subject: this.subject()?.title, topic: this.topic()?.title },
    });
  }
}
