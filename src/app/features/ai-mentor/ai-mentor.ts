import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { AiChatMessage } from '../../core/models';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

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
  imports: [FormsModule, MarkdownPipe],
  templateUrl: './ai-mentor.html',
  styleUrl: './ai-mentor.scss',
})
export class AiMentorComponent {
  private readonly aiAssistantService = inject(AiAssistantService);

  subject = input<string>();
  topic = input<string>();

  readonly quickPrompts = QUICK_PROMPTS;
  readonly messages = signal<AiChatMessage[]>([]);
  readonly draft = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly contextLabel = computed(() => {
    const parts = [this.subject(), this.topic()].filter(Boolean);
    return parts.length > 0 ? parts.join(' › ') : null;
  });

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
      .subscribe({
        next: (reply) => {
          this.messages.update((all) => [...all, { role: 'assistant', content: reply }]);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.loading.set(false);
        },
      });
  }

  clearChat(): void {
    this.messages.set([]);
    this.errorMessage.set(null);
  }
}
