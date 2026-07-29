import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EditorView, basicSetup } from 'codemirror';
import { Compartment } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { CodeRunnerService, LogEntry } from '../../core/services/code-runner.service';
import { ContentService } from '../../core/services/content.service';
import { SettingsService } from '../../core/services/settings.service';
import { IconComponent } from '../../shared/components/icon/icon';

interface Snippet {
  id: string;
  groupLabel: string;
  label: string;
  code: string;
}

const STARTER_CODE = `// Try any JavaScript here — console output shows up on the right.
// Tip: pick a snippet above to practice a real interview question.

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Skill Hunter'));
`;

@Component({
  selector: 'app-playground',
  imports: [IconComponent],
  templateUrl: './playground.html',
  styleUrl: './playground.scss',
})
export class PlaygroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private readonly codeRunner = inject(CodeRunnerService);
  private readonly contentService = inject(ContentService);
  private readonly settingsService = inject(SettingsService);

  private readonly themeCompartment = new Compartment();
  private view?: EditorView;

  private readonly jsTopics = toSignal(this.contentService.getSubjectTopics('javascript'), {
    initialValue: [],
  });

  readonly running = signal(false);
  readonly logs = signal<LogEntry[]>([]);
  readonly runError = signal<string | null>(null);
  readonly elapsedMs = signal<number | null>(null);
  readonly hasRun = signal(false);
  readonly selectedSnippetId = signal('');

  readonly snippets = computed<Snippet[]>(() => {
    const result: Snippet[] = [];
    const topics = [...this.jsTopics()].filter((t) => t.categoryId === 'js-coding-practice');
    for (const topic of topics) {
      const blocks = [...topic.blocks].sort((a, b) => a.order - b.order);
      for (const block of blocks) {
        const code = 'code' in block ? block.code : undefined;
        if (!code) continue;
        const label = block.title ?? ('question' in block ? block.question : undefined) ?? block.id;
        result.push({ id: block.id, groupLabel: topic.title, label, code });
      }
    }
    return result;
  });

  readonly snippetGroups = computed(() => {
    const groups = new Map<string, Snippet[]>();
    for (const snippet of this.snippets()) {
      const list = groups.get(snippet.groupLabel) ?? [];
      list.push(snippet);
      groups.set(snippet.groupLabel, list);
    }
    return Array.from(groups.entries()).map(([groupLabel, items]) => ({ groupLabel, items }));
  });

  constructor() {
    effect(() => {
      const isDark = this.settingsService.settings().theme === 'dark';
      if (!this.view) return;
      this.view.dispatch({
        effects: this.themeCompartment.reconfigure(isDark ? [oneDark] : []),
      });
    });
  }

  ngAfterViewInit(): void {
    const isDark = this.settingsService.settings().theme === 'dark';
    this.view = new EditorView({
      doc: STARTER_CODE,
      parent: this.editorHost.nativeElement,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab, { key: 'Mod-Enter', run: () => (this.run(), true) }]),
        javascript(),
        this.themeCompartment.of(isDark ? [oneDark] : []),
        EditorView.theme({ '&': { height: '100%', fontSize: '0.9rem' } }),
      ],
    });
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }

  loadSnippet(id: string): void {
    this.selectedSnippetId.set(id);
    const snippet = this.snippets().find((s) => s.id === id);
    if (!snippet || !this.view) return;
    this.setEditorValue(snippet.code);
    this.hasRun.set(false);
    this.logs.set([]);
    this.runError.set(null);
  }

  reset(): void {
    this.selectedSnippetId.set('');
    this.setEditorValue(STARTER_CODE);
    this.hasRun.set(false);
    this.logs.set([]);
    this.runError.set(null);
    this.elapsedMs.set(null);
  }

  async run(): Promise<void> {
    if (!this.view || this.running()) return;
    const code = this.view.state.doc.toString();
    this.running.set(true);

    const result = await this.codeRunner.run(code);

    this.logs.set(result.logs);
    this.runError.set(result.error);
    this.elapsedMs.set(Math.round(result.ms));
    this.hasRun.set(true);
    this.running.set(false);
  }

  private setEditorValue(code: string): void {
    if (!this.view) return;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: code },
    });
  }
}
