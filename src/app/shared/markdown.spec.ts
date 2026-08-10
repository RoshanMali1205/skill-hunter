import { describe, expect, it } from 'vitest';
import { markdownToPlainText, renderInlineMarkdown, renderMarkdown } from './markdown';

describe('renderMarkdown links', () => {
  it('turns bare https URLs into new-tab anchors', () => {
    const html = renderMarkdown('- https://developer.mozilla.org/en-US/docs/Web/JavaScript');
    expect(html).toContain(
      '<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noopener noreferrer">',
    );
    expect(html).toContain('</a>');
  });

  it('keeps trailing punctuation outside the link', () => {
    const html = renderMarkdown('See https://example.com/docs.');
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('</a>.');
  });

  it('supports markdown link syntax', () => {
    const html = renderMarkdown('[MDN](https://developer.mozilla.org/)');
    expect(html).toContain(
      '<a href="https://developer.mozilla.org/" target="_blank" rel="noopener noreferrer">MDN</a>',
    );
  });

  it('does not linkify URLs inside inline code', () => {
    const html = renderInlineMarkdown('Use `https://example.com` as text');
    expect(html).toContain('<code>https://example.com</code>');
    expect(html).not.toContain('<a ');
  });

  it('rejects non-http schemes', () => {
    const html = renderMarkdown('[x](javascript:alert(1))');
    expect(html).not.toContain('<a ');
  });
});

describe('markdownToPlainText', () => {
  it('keeps link labels for spoken text', () => {
    expect(markdownToPlainText('[MDN Guide](https://developer.mozilla.org/)')).toBe('MDN Guide');
  });
});
