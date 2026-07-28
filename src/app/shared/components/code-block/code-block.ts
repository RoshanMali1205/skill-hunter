import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-code-block',
  templateUrl: './code-block.html',
  styleUrl: './code-block.scss',
})
export class CodeBlockComponent {
  code = input.required<string>();
  language = input<string>('typescript');

  copied = signal(false);

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }
  }
}
