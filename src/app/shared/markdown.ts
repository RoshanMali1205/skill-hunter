function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
}

/**
 * Renders only inline formatting (backtick code, bold, italic) without
 * wrapping the result in a block element such as <p>. Source text is
 * HTML-escaped first. Use this for single-line content that already sits
 * inside its own element (a heading, a list item, a chip) where a nested
 * <p> from the full renderMarkdown() would be invalid or unwanted.
 */
export function renderInlineMarkdown(raw: string): string {
  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return inline(escaped);
}

const CODE_TOKEN_LINE = /^CODEBLOCK(\d+)$/;
const CODE_TOKEN_GLOBAL = /CODEBLOCK(\d+)/g;

/**
 * Converts a constrained subset of markdown (headings, bold/italic, inline
 * and fenced code, bullet/numbered lists, horizontal rules) into HTML.
 * All source text is HTML-escaped before any tag is introduced, so the
 * output only ever contains the whitelisted tags this function builds —
 * safe to render as trusted HTML even though the source is LLM output.
 */
export function renderMarkdown(raw: string): string {
  let text = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const codeBlocks: string[] = [];
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_match, lang: string | undefined, code: string) => {
    const index = codeBlocks.length;
    const langClass = lang ? ` class="language-${lang}"` : '';
    codeBlocks.push(`<pre class="md-code"><code${langClass}>${code.trim()}</code></pre>`);
    return `\nCODEBLOCK${index}\n`;
  });

  const lines = text.split('\n');
  const htmlLines: string[] = [];
  let listMode: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listMode) {
      htmlLines.push(listMode === 'ul' ? '</ul>' : '</ol>');
      listMode = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const codeToken = trimmed.match(CODE_TOKEN_LINE);
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    const isHr = /^-{3,}$/.test(trimmed);

    if (codeToken) {
      closeList();
      htmlLines.push(trimmed);
    } else if (isHr) {
      closeList();
      htmlLines.push('<hr class="md-hr" />');
    } else if (headingMatch) {
      closeList();
      htmlLines.push(`<p class="md-heading">${inline(headingMatch[2])}</p>`);
    } else if (ulMatch) {
      if (listMode !== 'ul') {
        closeList();
        htmlLines.push('<ul>');
        listMode = 'ul';
      }
      htmlLines.push(`<li>${inline(ulMatch[1])}</li>`);
    } else if (olMatch) {
      if (listMode !== 'ol') {
        closeList();
        htmlLines.push('<ol>');
        listMode = 'ol';
      }
      htmlLines.push(`<li>${inline(olMatch[1])}</li>`);
    } else if (trimmed === '') {
      closeList();
      htmlLines.push('');
    } else {
      closeList();
      htmlLines.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();

  let html = htmlLines.filter(Boolean).join('\n');
  html = html.replace(CODE_TOKEN_GLOBAL, (_match, i: string) => codeBlocks[Number(i)]);

  return html;
}
