import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { renderInlineMarkdown } from '../markdown';

@Pipe({ name: 'markdownInline' })
export class MarkdownInlinePipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderInlineMarkdown(value));
  }
}
