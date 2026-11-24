function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Only allow http(s) destinations. Input may already be HTML-escaped
 * (e.g. `&amp;` in query strings), so decode those before URL parsing.
 */
function safeHttpHref(raw: string): string | null {
  const decoded = raw.replace(/&amp;/g, '&');
  try {
    const parsed = new URL(decoded);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function externalAnchor(href: string, labelHtml: string): string {
  const safe = safeHttpHref(href);
  if (!safe) return labelHtml;
  return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${labelHtml}</a>`;
}

/** Split trailing punctuation that is usually not part of a bare URL. */
function splitTrailingPunctuation(value: string): { url: string; trailing: string } {
  let url = value;
  let trailing = '';
  while (/[.,;:!?'"]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }
  while (url.endsWith(')')) {
    const opens = (url.match(/\(/g) ?? []).length;
    const closes = (url.match(/\)/g) ?? []).length;
    if (opens >= closes) break;
    trailing = `)${trailing}`;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}

function linkify(text: string): string {
  // Protect inline code so URLs inside backticks stay plain text.
  const protectedSpans: string[] = [];
  const protect = (match: string): string => {
    const index = protectedSpans.length;
    protectedSpans.push(match);
    return `\0PROT${index}\0`;
  };

  let withPlaceholders = text.replace(/<code>[\s\S]*?<\/code>/g, protect);

  // Markdown links: [label](https://…)
  withPlaceholders = withPlaceholders.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, href: string) => protect(externalAnchor(href, label)),
  );

  // Bare http(s) URLs
  withPlaceholders = withPlaceholders.replace(/https?:\/\/[^\s<]+/g, (match) => {
    const { url, trailing } = splitTrailingPunctuation(match);
    if (!url) return match;
    return `${externalAnchor(url, url)}${trailing}`;
  });

  return withPlaceholders.replace(
    /\0PROT(\d+)\0/g,
    (_match, index: string) => protectedSpans[Number(index)]!,
  );
}

function inline(text: string): string {
  const withCode = text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  return linkify(withCode);
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
 * and fenced code, bullet/numbered lists, horizontal rules, http(s) links)
 * into HTML. All source text is HTML-escaped before any tag is introduced, so
 * the output only ever contains the whitelisted tags this function builds —
 * safe to render as trusted HTML even though the source is LLM output.
 *
 * External links always open in a new tab (`target="_blank"`) with
 * `rel="noopener noreferrer"` so installed PWA / standalone mode keeps the
 * Skill Hunter shell and docs open in the system browser.
 */
export function renderMarkdown(raw: string): string {
  let text = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const codeBlocks: string[] = [];
  text = text.replace(
    /```(\w+)?\n?([\s\S]*?)```/g,
    (_match, lang: string | undefined, code: string) => {
      const index = codeBlocks.length;
      const langClass = lang ? ` class="language-${lang}"` : '';
      codeBlocks.push(`<pre class="md-code"><code${langClass}>${code.trim()}</code></pre>`);
      return `\nCODEBLOCK${index}\n`;
    },
  );

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

/**
 * Strips the same constrained markdown subset back down to plain, spoken-
 * friendly text (no `#`, `**`, backticks, list bullets, fenced code, or
 * HTML). Intended for feeding topic content to the Speech Synthesis API,
 * which cannot make use of markup.
 *
 * Fenced code is omitted. Short inline names (`useState`, `ngOnInit`) are
 * kept so the terms are still heard. Expressions are reduced to their words
 * so the voice does not read braces and punctuation aloud.
 */
export function markdownToPlainText(raw: string): string {
  return raw
    .replace(/```[\w-]*\n?[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, (_match, code: string) => spokenInlineCode(code))
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+([.!?])/g, '$1')
    .replace(/([.!?])(?:\s*[.!?])+/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function spokenInlineCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return '';
  // Identifiers and short phrases are the vocabulary of the topic.
  // A colon is spoken as a pause ("standalone, false") instead of "colon".
  if (!/[(){}[\]<>=;]/.test(trimmed) && !trimmed.includes('=>')) {
    return trimmed.replace(/\s*:\s*/g, ', ');
  }
  const words = trimmed
    .replace(/['"`][^'"`]*['"`]/g, ' ')
    .replace(/[^A-Za-z0-9_$]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^\d+$/.test(word));
  if (words.length === 0 || words.length > 6) return '';
  return words.join(' ');
}
