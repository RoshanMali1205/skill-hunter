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

  it('drops fenced code and keeps the surrounding explanation', () => {
    const spoken = markdownToPlainText('Call it.\n\n```ts\nconst x = 1;\n```\n\nThen continue.');
    expect(spoken).toBe('Call it. Then continue.');
    expect(spoken).not.toContain('const');
  });

  it('keeps short inline names and does not read code expressions aloud', () => {
    expect(markdownToPlainText('Use `useState` and `standalone: false` here.')).toBe(
      'Use useState and standalone, false here.',
    );
    const spoken = markdownToPlainText("Then `dispatch({ type: 'itemAdded' })` runs.");
    expect(spoken).toBe('Then dispatch type runs.');
    expect(spoken).not.toContain('itemAdded');
    expect(spoken).not.toContain('{');
  });
});
