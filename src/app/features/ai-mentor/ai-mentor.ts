import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { AiChatStore } from '../../core/services/ai-chat.store';
import { NoteService } from '../../core/services/note.service';
import {
  AI_CHAT_MAX_API_MESSAGES,
  AiChatContext,
  AiChatMessage,
  AiConversation,
} from '../../core/models';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { IconComponent } from '../../shared/components/icon/icon';
import { hasInAppHistory } from '../../shared/navigation';
import { dateKey } from '../../shared/date-key';

interface QuickPrompt {
  label: string;
  prompt: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Explain closures for an interview',
    prompt:
      'Explain JavaScript closures the way you would to a senior frontend interview candidate, with a short example.',
  },
  {
    label: 'Ask me a tricky Angular question',
    prompt:
      'Give me one tricky, senior-level Angular interview question. Do not reveal the answer until I respond with my own answer first.',
  },
  {
    label: 'switchMap vs mergeMap vs exhaustMap',
    prompt:
      'Compare switchMap, mergeMap, concatMap, and exhaustMap with one realistic UI scenario for each.',
  },
  {
    label: 'Review my answer',
    prompt:
      'I want you to review my answer to an interview question. Ask me which question and answer I want reviewed.',
  },
];

@Component({
  selector: 'app-ai-mentor',
  imports: [FormsModule, MarkdownPipe, IconComponent],
  templateUrl: './ai-mentor.html',
  styleUrl: './ai-mentor.scss',
})
export class AiMentorComponent {
  private readonly aiAssistantService = inject(AiAssistantService);
  private readonly chatStore = inject(AiChatStore);
  private readonly noteService = inject(NoteService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  subject = input<string>();
  topic = input<string>();
  subjectId = input<string>();
  topicId = input<string>();
  question = input<string>();

  private readonly chatScroll = viewChild<ElementRef<HTMLElement>>('chatScroll');

  readonly quickPrompts = QUICK_PROMPTS;
  readonly conversations = this.chatStore.conversations;
  readonly activeConversation = this.chatStore.activeConversation;
  readonly messages = this.chatStore.activeMessages;
  readonly activeId = this.chatStore.activeId;

  readonly draft = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copiedIndex = signal<number | null>(null);
  readonly savedIndex = signal<number | null>(null);
  readonly historyOpen = signal(false);

  private seededFromRoute = false;
  private initialized = false;

  readonly contextLabel = computed(() => {
    const active = this.activeConversation();
    const parts = [
      active?.subjectTitle ?? this.subject(),
      active?.topicTitle ?? this.topic(),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' › ') : null;
  });

  readonly hasTopicContext = computed(() => {
    const active = this.activeConversation();
    return !!(active?.topicId && active?.subjectId) || !!(this.topicId() && this.subjectId());
  });

  readonly groupedConversations = computed(() => {
    const today = dateKey();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = dateKey(yesterdayDate);

    const groups: { label: string; items: AiConversation[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Earlier', items: [] },
    ];

    for (const conversation of this.conversations()) {
      const key = dateKey(new Date(conversation.updatedAt));
      if (key === today) groups[0]!.items.push(conversation);
      else if (key === yesterday) groups[1]!.items.push(conversation);
      else groups[2]!.items.push(conversation);
    }

    return groups.filter((group) => group.items.length > 0);
  });

  constructor() {
    effect(() => {
      const topicId = this.topicId();
      const subjectId = this.subjectId();
      const subject = this.subject();
      const topic = this.topic();
      const question = this.question();

      untracked(() => {
        const context: AiChatContext = {
          subjectTitle: subject,
          topicTitle: topic,
          subjectId,
          topicId,
        };

        if (!this.seededFromRoute && (topicId || subjectId || question)) {
          this.seededFromRoute = true;
          this.initialized = true;
          if (topicId) {
            this.chatStore.openForTopic(context);
          } else {
            this.chatStore.ensureActive(context);
          }
          if (question && this.messages().length === 0 && !this.draft()) {
            this.draft.set(question);
          }
          return;
        }

        if (!this.initialized) {
          this.initialized = true;
          this.chatStore.ensureActive();
        }
      });
    });

    // Keep the transcript pinned to the latest message.
    effect(() => {
      this.messages();
      this.loading();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  toggleHistory(): void {
    this.historyOpen.update((open) => !open);
  }

  selectConversation(id: string): void {
    if (this.loading()) return;
    this.chatStore.selectConversation(id);
    this.errorMessage.set(null);
    this.historyOpen.set(false);
  }

  startNewChat(): void {
    if (this.loading()) return;
    this.chatStore.startNewChat({
      subjectTitle: this.subject(),
      topicTitle: this.topic(),
      subjectId: this.subjectId(),
      topicId: this.topicId(),
    });
    this.draft.set('');
    this.errorMessage.set(null);
    this.historyOpen.set(false);
  }

  deleteConversation(event: Event, id: string): void {
    event.stopPropagation();
    if (this.loading() && this.activeId() === id) return;
    this.chatStore.deleteConversation(id);
    this.chatStore.ensureActive();
    this.errorMessage.set(null);
  }

  goBack(): void {
    if (hasInAppHistory()) {
      this.location.back();
    } else if (this.hasTopicContext()) {
      this.router.navigate(['/subjects', this.subjectId(), 'topics', this.topicId()]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  sendDraft(): void {
    const text = this.draft().trim();
    if (!text || this.loading()) return;
    this.draft.set('');
    this.send(text);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    this.sendDraft();
  }

  sendPrompt(prompt: string): void {
    if (this.loading()) return;
    this.send(prompt);
  }

  private send(text: string): void {
    this.chatStore.ensureActive({
      subjectTitle: this.subject(),
      topicTitle: this.topic(),
      subjectId: this.subjectId(),
      topicId: this.topicId(),
    });

    const userMessage: AiChatMessage = {
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    this.chatStore.appendToActive(userMessage);
    this.errorMessage.set(null);
    this.loading.set(true);

    const history = this.messages().slice(-AI_CHAT_MAX_API_MESSAGES);
    const active = this.activeConversation();

    this.aiAssistantService
      .sendMessage(history, {
        subjectTitle: active?.subjectTitle ?? this.subject(),
        topicTitle: active?.topicTitle ?? this.topic(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reply) => {
          this.chatStore.appendToActive({
            role: 'assistant',
            content: reply,
            createdAt: new Date().toISOString(),
          });
          this.loading.set(false);
        },
        error: (err: Error) => {
          // Roll back the pending user turn so a retry does not send
          // consecutive user messages (which providers often reject).
          const current = this.messages();
          if (current.length > 0 && current[current.length - 1]?.role === 'user') {
            this.chatStore.setActiveMessages(current.slice(0, -1));
          }
          this.draft.set(text);
          this.errorMessage.set(err.message);
          this.loading.set(false);
        },
      });
  }

  async copyMessage(index: number, content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      this.copiedIndex.set(index);
      setTimeout(() => this.copiedIndex.update((i) => (i === index ? null : i)), 1500);
    } catch {
      this.copiedIndex.set(null);
    }
  }

  saveToNotes(index: number, content: string): void {
    const active = this.activeConversation();
    const topicId = active?.topicId ?? this.topicId();
    const subjectId = active?.subjectId ?? this.subjectId();
    if (!topicId || !subjectId) return;

    this.noteService.appendToNote(topicId, subjectId, content);
    this.savedIndex.set(index);
    setTimeout(() => this.savedIndex.update((i) => (i === index ? null : i)), 1500);
  }

  previewText(conversation: AiConversation): string {
    const last = [...conversation.messages].reverse().find((m) => m.content.trim());
    if (!last) return 'No messages yet';
    const compact = last.content.replace(/\s+/g, ' ').trim();
    return compact.length > 64 ? `${compact.slice(0, 61)}…` : compact;
  }

  private scrollToBottom(): void {
    const el = this.chatScroll()?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }
}
