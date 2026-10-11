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
import { StorageService } from '../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../core/storage/storage-keys';
import { IconComponent } from '../../shared/components/icon/icon';
import { SelectComponent } from '../../shared/components/select/select';
import { SelectOptionGroup } from '../../shared/components/select/select.models';

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
  imports: [IconComponent, SelectComponent],
  templateUrl: './playground.html',
  styleUrl: './playground.scss',
})
export class PlaygroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private readonly codeRunner = inject(CodeRunnerService);
  private readonly contentService = inject(ContentService);
  private readonly settingsService = inject(SettingsService);
  private readonly storage = inject(StorageService);

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
  /** Set when the learner asked to replace code they have edited; waits for a decision. */
  readonly pendingReplace = signal<{ snippetId: string } | null>(null);
  /** True when the editor holds a saved draft from an earlier visit. */
  readonly draftRestored = signal(false);

  /** The code last loaded into the editor (starter or a snippet): anything else is the learner's own work. */
  private baseline = STARTER_CODE;

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

  readonly snippetSelectGroups = computed<SelectOptionGroup[]>(() => [
    {
      label: 'Templates',
      options: [{ value: '', label: '— Starter template —' }],
    },
    ...this.snippetGroups().map((group) => ({
      label: group.groupLabel,
      options: group.items.map((item) => ({ value: item.id, label: item.label })),
    })),
  ]);

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
    const restoredDraft = this.readDraft();
    this.draftRestored.set(restoredDraft !== null);
    this.view = new EditorView({
      doc: restoredDraft ?? STARTER_CODE,
      parent: this.editorHost.nativeElement,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab, { key: 'Mod-Enter', run: () => (this.run(), true) }]),
        javascript(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) this.saveDraft();
        }),
        EditorView.lineWrapping,
        this.themeCompartment.of(isDark ? [oneDark] : []),
        EditorView.theme({
          '&': { height: '100%', fontSize: '0.95rem' },
          '.cm-content': { paddingBottom: '1rem' },
          '.cm-scroller': { lineHeight: '1.5' },
        }),
      ],
    });
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }

  /** Picks a snippet, asking first if that would overwrite code the learner wrote. */
  loadSnippet(id: string): void {
    if (this.isDirty()) {
      this.pendingReplace.set({ snippetId: id });
      return;
    }
    this.applySnippet(id);
  }

  reset(): void {
    this.loadSnippet('');
  }

  confirmReplace(): void {
    const pending = this.pendingReplace();
    this.pendingReplace.set(null);
    if (pending) this.applySnippet(pending.snippetId);
  }

  cancelReplace(): void {
    this.pendingReplace.set(null);
  }

  private applySnippet(id: string): void {
    const snippet = id ? this.snippets().find((s) => s.id === id) : undefined;
    if (id && !snippet) return;
    this.selectedSnippetId.set(id);
    this.draftRestored.set(false);
    this.setEditorValue(snippet?.code ?? STARTER_CODE);
    this.hasRun.set(false);
    this.logs.set([]);
    this.runError.set(null);
    this.elapsedMs.set(null);
  }

  private isDirty(): boolean {
    return !!this.view && this.view.state.doc.toString() !== this.baseline;
  }

  private readDraft(): string | null {
    try {
      const draft = this.storage.get<string | null>(STORAGE_KEYS.playgroundDraft, null);
      return typeof draft === 'string' && draft !== STARTER_CODE ? draft : null;
    } catch {
      return null;
    }
  }

  /** Keeps the learner's own code so leaving the page never loses it. Failures never break typing. */
  private saveDraft(): void {
    try {
      if (this.isDirty()) {
        this.storage.set(STORAGE_KEYS.playgroundDraft, this.view!.state.doc.toString());
      } else {
        this.storage.remove(STORAGE_KEYS.playgroundDraft);
      }
    } catch {
      // Storage may be full or blocked; the editor still works, only recovery is lost.
    }
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
    this.baseline = code;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: code },
    });
  }
}
