import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { MarkdownInlinePipe } from './markdown-inline.pipe';
import { MarkdownPipe } from './markdown.pipe';

describe('markdown pipes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MarkdownPipe, MarkdownInlinePipe] });
  });

  function html(value: SafeHtml): string {
    return TestBed.inject(DomSanitizer).sanitize(SecurityContext.HTML, value) ?? '';
  }

  it('renders block markdown as trusted html', () => {
    const rendered = html(TestBed.inject(MarkdownPipe).transform('**bold**'));
    expect(rendered).toContain('<strong>bold</strong>');
    expect(rendered).toContain('<p>');
  });

  it('renders inline markdown without a paragraph wrapper', () => {
    const rendered = html(TestBed.inject(MarkdownInlinePipe).transform('Use `ng test`'));
    expect(rendered).toContain('<code>ng test</code>');
    expect(rendered).not.toContain('<p>');
  });
});
