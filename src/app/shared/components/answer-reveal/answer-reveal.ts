import { Component, input, linkedSignal } from '@angular/core';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { MarkdownInlinePipe } from '../../pipes/markdown-inline.pipe';

@Component({
  selector: 'app-answer-reveal',
  imports: [MarkdownPipe, MarkdownInlinePipe],
  templateUrl: './answer-reveal.html',
  styleUrl: './answer-reveal.scss',
})
export class AnswerRevealComponent {
  answer = input.required<string>();
  explanation = input<string>('');
  hints = input<string[]>([]);
  autoReveal = input<boolean>(false);
  /**
   * Identifies the question being shown. When it changes the reveal state
   * starts over, so a manual "Show Answer" never carries into the next question.
   */
  questionId = input<string>('');

  /** Follows the auto-reveal setting, and resets whenever the question changes. */
  readonly revealed = linkedSignal<{ id: string; auto: boolean; answer: string }, boolean>({
    source: () => ({ id: this.questionId(), auto: this.autoReveal(), answer: this.answer() }),
    computation: (source) => source.auto,
  });

  toggle(): void {
    this.revealed.update((revealed) => !revealed);
  }
}
