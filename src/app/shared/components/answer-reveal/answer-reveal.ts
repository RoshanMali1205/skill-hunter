import { Component, computed, input, signal } from '@angular/core';
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

  private readonly manualOverride = signal<boolean | null>(null);

  readonly revealed = computed(() => this.manualOverride() ?? this.autoReveal());

  toggle(): void {
    this.manualOverride.set(!this.revealed());
  }
}
