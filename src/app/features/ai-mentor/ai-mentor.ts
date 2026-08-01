import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { NoteService } from '../../core/services/note.service';
import { AiChatMessage } from '../../core/models';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { IconComponent } from '../../shared/components/icon/icon';
import { hasInAppHistory } from '../../shared/navigation';

interface QuickPrompt {
  label: string;
  prompt: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'Explain closures for an interview', prompt: 'Explain JavaScript closures the way you would to a senior frontend interview candidate, with a short example.' },
  { label: 'Ask me a tricky Angular question', prompt: 'Give me one tricky, senior-level Angular interview question. Do not reveal the answer until I respond with my own answer first.' },
  { label: 'switchMap vs mergeMap vs exhaustMap', prompt: 'Compare switchMap, mergeMap, concatMap, and exhaustMap with one realistic UI scenario for each.' },
  { label: 'Review my answer', prompt: 'I want you to review my answer to an interview question. Ask me which question and answer I want reviewed.' },
];

@Component({
  selector: 'app-ai-mentor',
  imports: [FormsModule, MarkdownPipe, IconComponent],
  templateUrl: './ai-mentor.html',
  styleUrl: './ai-mentor.scss',
})
export class AiMentorComponent {
  private readonly aiAssistantService = inject(AiAssistantService);
  private readonly noteService = inject(NoteService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  subject = input<string>();
  topic = input<string>();
  subjectId = input<string>();
  topicId = input<string>();
  question = input<string>();

  readonly quickPrompts = QUICK_PROMPTS;
  readonly messages = signal<AiChatMessage[]>([]);
  readonly draft = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copiedIndex = signal<number | null>(null);
  readonly savedIndex = signal<number | null>(null);

  readonly contextLabel = computed(() => {
    const parts = [this.subject(), this.topic()].filter(Boolean);
    return parts.length > 0 ? parts.join(' › ') : null;
  });

  readonly hasTopicContext = computed(() => !!this.topicId() && !!this.subjectId());

  constructor() {
    effect(() => {
      const question = this.question();
      if (!question) return;
      untracked(() => {
        if (this.messages().length === 0 && !this.draft()) {
          this.draft.set(question);
        }
      });
    });
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

  sendPrompt(prompt: string): void {
    if (this.loading()) return;
    this.send(prompt);
  }

  private send(text: string): void {
    const userMessage: AiChatMessage = { role: 'user', content: text };
    this.messages.update((all) => [...all, userMessage]);
    this.errorMessage.set(null);
    this.loading.set(true);

    this.aiAssistantService
      .sendMessage(this.messages(), {
        subjectTitle: this.subject(),
        topicTitle: this.topic(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reply) => {
          this.messages.update((all) => [...all, { role: 'assistant', content: reply }]);
          this.loading.set(false);
        },
        error: (err: Error) => {
          // Roll back the pending user turn so a retry does not send
          // consecutive user messages (which providers often reject).
          this.messages.update((all) =>
            all.length > 0 && all[all.length - 1]?.role === 'user' ? all.slice(0, -1) : all,
          );
          this.draft.set(text);
          this.errorMessage.set(err.message);
          this.loading.set(false);
        },
      });
  }

  clearChat(): void {
    this.messages.set([]);
    this.errorMessage.set(null);
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
    const topicId = this.topicId();
    const subjectId = this.subjectId();
    if (!topicId || !subjectId) return;

    this.noteService.appendToNote(topicId, subjectId, content);
    this.savedIndex.set(index);
    setTimeout(() => this.savedIndex.update((i) => (i === index ? null : i)), 1500);
  }
}
