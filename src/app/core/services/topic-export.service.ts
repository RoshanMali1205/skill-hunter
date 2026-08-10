import { Injectable, inject } from '@angular/core';
import { forkJoin, firstValueFrom, map, of } from 'rxjs';
import {
  ContentBlock,
  DEFAULT_TOPIC_EXPORT_OPTIONS,
  QuestionBlock,
  Subject,
  Topic,
  TopicExportOptions,
  TopicExportRef,
} from '../models';
import { ContentService } from './content.service';
import { NoteService } from './note.service';
import { renderInlineMarkdown, renderMarkdown } from '../../shared/markdown';

interface ResolvedTopic {
  subject: Subject;
  categoryTitle: string;
  topic: Topic;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class TopicExportService {
  private readonly content = inject(ContentService);
  private readonly notes = inject(NoteService);

  /**
   * Opens a print-ready study pack. The browser “Save as PDF” dialog is the
   * delivery mechanism — no PDF library required, and it works in the PWA.
   */
  async exportTopics(
    refs: TopicExportRef[],
    options: TopicExportOptions = DEFAULT_TOPIC_EXPORT_OPTIONS,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const unique = this.dedupe(refs);
    if (unique.length === 0) {
      return { ok: false, error: 'Select at least one topic to export.' };
    }

    try {
      const resolved = await this.resolveTopics(unique, options.includeNotes);
      if (resolved.length === 0) {
        return { ok: false, error: 'Those topics could not be loaded.' };
      }

      const html = this.buildDocument(resolved, options);
      const opened = this.openPrintDocument(html);
      if (!opened) {
        return {
          ok: false,
          error: 'Pop-up blocked. Allow pop-ups for Skill Hunter, then try again.',
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Export failed. Please try again.' };
    }
  }

  private dedupe(refs: TopicExportRef[]): TopicExportRef[] {
    const seen = new Set<string>();
    const result: TopicExportRef[] = [];
    for (const ref of refs) {
      if (seen.has(ref.topicId)) continue;
      seen.add(ref.topicId);
      result.push(ref);
    }
    return result;
  }

  private async resolveTopics(
    refs: TopicExportRef[],
    includeNotes: boolean,
  ): Promise<ResolvedTopic[]> {
    const subjects = await firstValueFrom(this.content.getSubjects());
    const bySubject = new Map<string, string[]>();
    for (const ref of refs) {
      const list = bySubject.get(ref.subjectId) ?? [];
      list.push(ref.topicId);
      bySubject.set(ref.subjectId, list);
    }

    const loads = [...bySubject.entries()].map(([subjectId, topicIds]) =>
      this.content.getSubjectTopics(subjectId).pipe(
        map((topics) => {
          const subject = subjects.find((s) => s.id === subjectId);
          if (!subject) return [] as ResolvedTopic[];
          return topicIds
            .map((topicId) => topics.find((t) => t.id === topicId))
            .filter((t): t is Topic => !!t)
            .map((topic) => {
              const category = subject.categories.find((c) => c.id === topic.categoryId);
              return {
                subject,
                categoryTitle: category?.title ?? topic.categoryId,
                topic,
                note: includeNotes ? this.notes.getNote(topic.id)?.content : undefined,
              };
            });
        }),
      ),
    );

    if (loads.length === 0) return [];
    const groups = await firstValueFrom(forkJoin(loads.length ? loads : [of([] as ResolvedTopic[])]));
    const order = new Map(refs.map((ref, index) => [ref.topicId, index]));
    return groups.flat().sort((a, b) => (order.get(a.topic.id) ?? 0) - (order.get(b.topic.id) ?? 0));
  }

  private buildDocument(items: ResolvedTopic[], options: TopicExportOptions): string {
    const generated = new Date().toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const title =
      items.length === 1
        ? `Skill Hunter · ${items[0]!.topic.title}`
        : `Skill Hunter · Study pack (${items.length} topics)`;

    const toc =
      items.length > 1
        ? `<nav class="toc"><h2>Contents</h2><ol>${items
            .map(
              (item, index) =>
                `<li><a href="#topic-${index}">${this.escape(item.topic.title)}</a>
                <span class="toc-meta">${this.escape(item.subject.title)} · ${this.escape(item.categoryTitle)}</span></li>`,
            )
            .join('')}</ol></nav>`
        : '';

    const body = items
      .map((item, index) => this.renderTopic(item, index, options, items.length > 1))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escape(title)}</title>
  <style>${this.printStyles()}</style>
</head>
<body>
  <header class="doc-header">
    <p class="brand">Skill Hunter</p>
    <h1>${items.length === 1 ? this.escape(items[0]!.topic.title) : 'Study pack'}</h1>
    <p class="meta">${items.length} topic${items.length === 1 ? '' : 's'} · Generated ${this.escape(generated)}</p>
  </header>
  ${toc}
  <main>${body}</main>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 250);
    });
  </script>
</body>
</html>`;
  }

  private renderTopic(
    item: ResolvedTopic,
    index: number,
    options: TopicExportOptions,
    pageBreak: boolean,
  ): string {
    const { topic, subject, categoryTitle, note } = item;
    const blocks = [...topic.blocks].sort((a, b) => a.order - b.order);
    const minutes = topic.estimatedMinutes ? ` · ~${topic.estimatedMinutes} min` : '';

    return `<article class="topic${pageBreak ? ' topic--break' : ''}" id="topic-${index}">
      <header class="topic-head">
        <p class="eyebrow">${this.escape(subject.title)} · ${this.escape(categoryTitle)}</p>
        <h2>${this.escape(topic.title)}</h2>
        <p class="chips">
          <span>${this.escape(topic.difficulty)}</span>
          <span>${this.escape(topic.interviewPriority)}</span>${minutes}
        </p>
        ${topic.description ? `<div class="lede">${renderMarkdown(topic.description)}</div>` : ''}
      </header>
      ${blocks.map((block) => this.renderBlock(block, options)).join('\n')}
      ${
        note?.trim()
          ? `<section class="block"><h3>Your note</h3><div class="md">${renderMarkdown(note)}</div></section>`
          : ''
      }
    </article>`;
  }

  private renderBlock(block: ContentBlock, options: TopicExportOptions): string {
    switch (block.type) {
      case 'concept':
        return `<section class="block">
          <h3>${this.escape(block.title || 'Concept')}</h3>
          <div class="md">${renderMarkdown(block.content)}</div>
          ${this.keyPoints(block.keyPoints)}
        </section>`;
      case 'code-example':
        if (!options.includeCode) {
          return `<section class="block">
            <h3>${this.escape(block.title || 'Code Example')}</h3>
            <div class="md">${renderMarkdown(block.explanation)}</div>
          </section>`;
        }
        return `<section class="block">
          <h3>${this.escape(block.title || 'Code Example')}</h3>
          <pre class="code"><code>${this.escape(block.code)}</code></pre>
          <div class="md">${renderMarkdown(block.explanation)}</div>
        </section>`;
      case 'common-mistake':
        return `<section class="block">
          <h3>${this.escape(block.title || 'Common Mistake')}</h3>
          <p><strong>Mistake:</strong> ${renderInlineMarkdown(block.mistake)}</p>
          <p><strong>Why:</strong> ${renderInlineMarkdown(block.whyItHappens)}</p>
          <p><strong>Correct approach:</strong> ${renderInlineMarkdown(block.correctApproach)}</p>
        </section>`;
      case 'best-practice':
        return `<section class="block">
          <h3>${this.escape(block.title || 'Best Practice')}</h3>
          <div class="md">${renderMarkdown(block.content)}</div>
          ${this.keyPoints(block.keyPoints)}
        </section>`;
      case 'summary':
        return `<section class="block">
          <h3>${this.escape(block.title || 'References')}</h3>
          <div class="md">${renderMarkdown(block.content)}</div>
        </section>`;
      case 'output-question':
      case 'interview-question':
      case 'tricky-question':
      case 'scenario-question':
        return this.renderQuestion(block, options);
      default:
        return '';
    }
  }

  private renderQuestion(block: QuestionBlock, options: TopicExportOptions): string {
    const label = block.title || this.questionLabel(block.type);
    const code =
      options.includeCode && block.code
        ? `<pre class="code"><code>${this.escape(block.code)}</code></pre>`
        : '';
    const answer = options.includeAnswers
      ? `<div class="answer">
           <p class="answer-label">Answer</p>
           <div class="md">${renderMarkdown(block.answer)}</div>
           ${
             block.explanation
               ? `<p class="answer-label">Explanation</p><div class="md">${renderMarkdown(block.explanation)}</div>`
               : ''
           }
         </div>`
      : '';

    return `<section class="block">
      <h3>${this.escape(label)}</h3>
      <div class="md">${renderMarkdown(block.question)}</div>
      ${code}
      ${answer}
    </section>`;
  }

  private questionLabel(type: QuestionBlock['type']): string {
    switch (type) {
      case 'output-question':
        return 'Output Question';
      case 'tricky-question':
        return 'Tricky Question';
      case 'scenario-question':
        return 'Scenario Question';
      default:
        return 'Interview Question';
    }
  }

  private keyPoints(points?: string[]): string {
    if (!points?.length) return '';
    return `<ul class="points">${points
      .map((point) => `<li>${renderInlineMarkdown(point)}</li>`)
      .join('')}</ul>`;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private openPrintDocument(html: string): boolean {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return false;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  }

  private printStyles(): string {
    return `
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
        font-size: 12.5pt;
        line-height: 1.55;
        color: #1f2937;
        background: #fff;
      }
      .doc-header { margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #0b6e99; }
      .brand { margin: 0 0 6px; font-size: 11pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #0b6e99; }
      h1 { margin: 0 0 8px; font-size: 22pt; line-height: 1.2; }
      .meta { margin: 0; color: #667085; font-size: 10.5pt; }
      .toc { margin: 0 0 28px; padding: 16px 18px; background: #f6f7f9; border: 1px solid #e3e7ec; border-radius: 10px; }
      .toc h2 { margin: 0 0 10px; font-size: 13pt; }
      .toc ol { margin: 0; padding-left: 1.2em; }
      .toc li { margin: 6px 0; }
      .toc a { color: #0b6e99; text-decoration: none; font-weight: 600; }
      .toc-meta { display: block; color: #667085; font-size: 10pt; font-weight: 400; }
      .topic { margin: 0 0 28px; }
      .topic--break { break-before: page; page-break-before: always; }
      .topic--break:first-of-type { break-before: auto; page-break-before: auto; }
      .topic-head { margin-bottom: 16px; }
      .eyebrow { margin: 0 0 4px; color: #667085; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.03em; }
      h2 { margin: 0 0 8px; font-size: 18pt; }
      .chips { margin: 0 0 10px; color: #667085; font-size: 10.5pt; text-transform: capitalize; }
      .chips span + span::before { content: " · "; }
      .lede { color: #374151; }
      .block { margin: 16px 0; padding-top: 12px; border-top: 1px solid #e3e7ec; break-inside: avoid; }
      h3 { margin: 0 0 8px; font-size: 13pt; color: #0a3d66; }
      .md p { margin: 0 0 8px; }
      .md ul, .md ol { margin: 0 0 8px; padding-left: 1.3em; }
      .md code, .points code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.92em;
        background: #f3f4f6;
        padding: 1px 4px;
        border-radius: 4px;
      }
      .code {
        margin: 8px 0 12px;
        padding: 12px 14px;
        overflow-x: auto;
        background: #111827;
        color: #f9fafb;
        border-radius: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 9.5pt;
        line-height: 1.45;
        white-space: pre;
      }
      .points { margin: 8px 0 0; padding-left: 1.2em; }
      .answer { margin-top: 10px; padding: 10px 12px; background: #f0f7fb; border-left: 3px solid #0b6e99; border-radius: 0 8px 8px 0; }
      .answer-label { margin: 0 0 4px; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #0b6e99; }
      a { color: #0b6e99; }
      @media print {
        body { padding: 0; }
        .toc, .block, .code { break-inside: avoid; }
        a { text-decoration: none; color: inherit; }
      }
    `;
  }
}
