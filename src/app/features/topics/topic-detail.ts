import { Component, computed, effect, inject, input, signal, DestroyRef } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, switchMap } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { BookmarkService } from '../../core/services/bookmark.service';
import { RevisionService } from '../../core/services/revision.service';
import { SettingsService } from '../../core/services/settings.service';
import { NoteService } from '../../core/services/note.service';
import { TextToSpeechService } from '../../core/services/text-to-speech.service';
import { ConfidenceLevel } from '../../core/models';
import { markdownToPlainText } from '../../shared/markdown';
import { hasInAppHistory } from '../../shared/navigation';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';
import { IconComponent } from '../../shared/components/icon/icon';
import { DifficultyChipComponent } from '../../shared/components/difficulty-chip/difficulty-chip';
import { PriorityChipComponent } from '../../shared/components/priority-chip/priority-chip';
import { CodeBlockComponent } from '../../shared/components/code-block/code-block';
import { QuestionCardComponent } from '../../shared/components/question-card/question-card';
import { BookmarkButtonComponent } from '../../shared/components/bookmark-button/bookmark-button';
import { NoteButtonComponent } from '../../shared/components/note-button/note-button';
import { ReadAloudButtonComponent } from '../../shared/components/read-aloud-button/read-aloud-button';
import { NoteEditorComponent } from '../../shared/components/note-editor/note-editor';
import { CompletionButtonComponent } from '../../shared/components/completion-button/completion-button';
import { ConfidenceSelectorComponent } from '../../shared/components/confidence-selector/confidence-selector';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { MarkdownInlinePipe } from '../../shared/pipes/markdown-inline.pipe';

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
    NoteButtonComponent,
    ReadAloudButtonComponent,
    NoteEditorComponent,
    CompletionButtonComponent,
    ConfidenceSelectorComponent,
    EmptyStateComponent,
    MarkdownPipe,
    MarkdownInlinePipe,
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
  private readonly noteService = inject(NoteService);
  private readonly ttsService = inject(TextToSpeechService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

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

  readonly note = computed(() => this.noteService.getNote(this.topicId()));
  readonly hasNote = computed(() => !!this.note());
  readonly noteEditorOpen = signal(false);

  readonly ttsSupported = this.ttsService.supported;
  readonly isSpeaking = computed(() => this.ttsService.speakingId() === this.topicId());

  readonly readableText = computed(() => {
    const topic = this.topic();
    if (!topic) {
      return '';
    }
    const parts = [topic.description];
    for (const block of this.sortedBlocks()) {
      if (block.type === 'concept') {
        parts.push(block.title ?? '', block.content, ...(block.keyPoints ?? []));
      } else if (block.type === 'code-example') {
        parts.push(block.title ?? '', block.explanation);
      } else if (block.type === 'common-mistake') {
        parts.push('Common mistake', block.mistake, block.whyItHappens, block.correctApproach);
      }
    }
    return markdownToPlainText(parts.filter(Boolean).join('\n\n'));
  });

  constructor() {
    effect(() => {
      const topicId = this.topicId();
      const subjectId = this.subjectId();
      this.ttsService.stop();
      if (topicId && subjectId) {
        this.progressStore.touchLastVisited(topicId, subjectId);
      }
    });

    inject(DestroyRef).onDestroy(() => this.ttsService.stop());
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

  goBack(): void {
    if (hasInAppHistory()) {
      this.location.back();
    } else {
      this.router.navigate(['/subjects', this.subjectId()]);
    }
  }

  toggleReadAloud(): void {
    this.ttsService.toggle(this.topicId(), this.readableText());
  }

  toggleNoteEditor(): void {
    this.noteEditorOpen.update((open) => !open);
  }

  saveNote(content: string): void {
    this.noteService.saveNote(this.topicId(), this.subjectId(), content);
    this.noteEditorOpen.set(false);
  }

  deleteNote(): void {
    this.noteService.deleteNote(this.topicId());
    this.noteEditorOpen.set(false);
  }

  practiceAgain(): void {
    this.router.navigate(['/practice'], { queryParams: { topicId: this.topicId() } });
  }

  askAi(): void {
    const topicTitle = this.topic()?.title;
    const question = topicTitle
      ? `Can you explain "${topicTitle}" in more depth, and give me a tricky follow-up question to test my understanding?`
      : undefined;
    this.router.navigate(['/ai-mentor'], {
      queryParams: {
        subject: this.subject()?.title,
        topic: topicTitle,
        subjectId: this.subjectId(),
        topicId: this.topicId(),
        question,
      },
    });
  }
}
