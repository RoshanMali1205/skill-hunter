import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { BookmarkService } from '../../core/services/bookmark.service';
import { RevisionService } from '../../core/services/revision.service';
import { TopicExportService } from '../../core/services/topic-export.service';
import {
  DEFAULT_TOPIC_EXPORT_OPTIONS,
  Subject,
  TOPIC_EXPORT_WARN_COUNT,
  TopicExportOptions,
  TopicExportRef,
  TopicSummary,
} from '../../core/models';
import { IconComponent } from '../../shared/components/icon/icon';
import { SelectComponent } from '../../shared/components/select/select';
import { SelectOption } from '../../shared/components/select/select.models';

interface TopicRow {
  subjectId: string;
  categoryId: string;
  categoryTitle: string;
  topic: TopicSummary;
}

@Component({
  selector: 'app-export',
  imports: [FormsModule, RouterLink, IconComponent, SelectComponent],
  templateUrl: './export.html',
  styleUrl: './export.scss',
})
export class ExportComponent {
  private readonly content = inject(ContentService);
  private readonly bookmarks = inject(BookmarkService);
  private readonly revision = inject(RevisionService);
  private readonly exporter = inject(TopicExportService);
  private readonly route = inject(ActivatedRoute);

  readonly subjects = toSignal(this.content.getSubjects(), { initialValue: [] as Subject[] });
  readonly selectedSubjectId = signal('');
  readonly selectedTopicIds = signal<Set<string>>(new Set());
  readonly options = signal<TopicExportOptions>({ ...DEFAULT_TOPIC_EXPORT_OPTIONS });
  readonly exporting = signal(false);
  readonly message = signal<{ text: string; success: boolean } | null>(null);
  private hydrated = false;

  private readonly querySubject = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('subjectId') ?? '')),
    { initialValue: '' },
  );
  private readonly queryTopic = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('topicId') ?? '')),
    { initialValue: '' },
  );

  readonly subjectOptions = computed<SelectOption[]>(() =>
    this.subjects().map((subject) => ({ value: subject.id, label: subject.title })),
  );

  readonly activeSubject = computed(() => {
    const id = this.selectedSubjectId() || this.subjects()[0]?.id || '';
    return this.subjects().find((subject) => subject.id === id);
  });

  readonly topicRows = computed<TopicRow[]>(() => {
    const subject = this.activeSubject();
    if (!subject) return [];
    const rows: TopicRow[] = [];
    for (const category of [...subject.categories].sort((a, b) => a.order - b.order)) {
      for (const topic of [...category.topics].sort((a, b) => a.title.localeCompare(b.title))) {
        rows.push({
          subjectId: subject.id,
          categoryId: category.id,
          categoryTitle: category.title,
          topic,
        });
      }
    }
    return rows;
  });

  readonly groupedRows = computed(() => {
    const groups = new Map<string, TopicRow[]>();
    for (const row of this.topicRows()) {
      const list = groups.get(row.categoryTitle) ?? [];
      list.push(row);
      groups.set(row.categoryTitle, list);
    }
    return [...groups.entries()].map(([title, items]) => ({ title, items }));
  });

  readonly selectedCount = computed(() => this.selectedTopicIds().size);
  readonly showLargePackWarning = computed(() => this.selectedCount() >= TOPIC_EXPORT_WARN_COUNT);

  constructor() {
    effect(() => {
      const subjects = this.subjects();
      if (!subjects.length || this.hydrated) return;
      this.hydrated = true;
      const subjectId = this.querySubject() || subjects[0]!.id;
      this.selectedSubjectId.set(subjectId);
      const topicId = this.queryTopic();
      if (topicId) {
        this.selectedTopicIds.set(new Set([topicId]));
      }
    });
  }

  setSubject(subjectId: string): void {
    this.selectedSubjectId.set(subjectId);
    this.selectedTopicIds.set(new Set());
    this.message.set(null);
  }

  isSelected(topicId: string): boolean {
    return this.selectedTopicIds().has(topicId);
  }

  toggleTopic(topicId: string, checked: boolean): void {
    this.selectedTopicIds.update((current) => {
      const next = new Set(current);
      if (checked) next.add(topicId);
      else next.delete(topicId);
      return next;
    });
  }

  toggleCategory(rows: TopicRow[], checked: boolean): void {
    this.selectedTopicIds.update((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (checked) next.add(row.topic.id);
        else next.delete(row.topic.id);
      }
      return next;
    });
  }

  categoryFullySelected(rows: TopicRow[]): boolean {
    return rows.length > 0 && rows.every((row) => this.selectedTopicIds().has(row.topic.id));
  }

  selectAllInSubject(): void {
    this.selectedTopicIds.set(new Set(this.topicRows().map((row) => row.topic.id)));
  }

  clearSelection(): void {
    this.selectedTopicIds.set(new Set());
  }

  selectBookmarks(): void {
    const bookmarked = this.bookmarks.bookmarkedTopicIds();
    const inSubject = this.topicRows()
      .map((row) => row.topic.id)
      .filter((id) => bookmarked.has(id));
    this.selectedTopicIds.set(new Set(inSubject));
    this.message.set(
      inSubject.length === 0
        ? { text: 'No bookmarked topics in this subject.', success: false }
        : null,
    );
  }

  selectRevision(): void {
    const revision = new Set(this.revision.revisionTopicIds());
    const inSubject = this.topicRows()
      .map((row) => row.topic.id)
      .filter((id) => revision.has(id));
    this.selectedTopicIds.set(new Set(inSubject));
    this.message.set(
      inSubject.length === 0
        ? { text: 'No revision-list topics in this subject.', success: false }
        : null,
    );
  }

  setOption<K extends keyof TopicExportOptions>(key: K, value: TopicExportOptions[K]): void {
    this.options.update((current) => ({ ...current, [key]: value }));
  }

  async exportSelected(): Promise<void> {
    const subjectId = this.activeSubject()?.id;
    if (!subjectId) return;

    const refs: TopicExportRef[] = [...this.selectedTopicIds()].map((topicId) => ({
      subjectId,
      topicId,
    }));

    this.exporting.set(true);
    this.message.set(null);
    const result = await this.exporter.exportTopics(refs, this.options());
    this.exporting.set(false);

    this.message.set(
      result.ok
        ? {
            text: 'Print dialog opened — choose “Save as PDF” to download your study pack.',
            success: true,
          }
        : { text: result.error, success: false },
    );
  }
}
