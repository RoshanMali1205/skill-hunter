import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { BookmarkService } from '../../core/services/bookmark.service';
import { MetricsService } from '../../core/services/metrics.service';
import { TopicFilter } from '../../core/models/filters.models';
import { TopicProgress, TopicSummary } from '../../core/models';
import { TopicCardComponent } from '../../shared/components/topic-card/topic-card';
import { FilterPanelComponent } from '../../shared/components/filter-panel/filter-panel';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar';
import { IconComponent } from '../../shared/components/icon/icon';
import { Category } from '../../core/models';
import { hasInAppHistory } from '../../shared/navigation';

@Component({
  selector: 'app-subject-detail',
  imports: [
    TopicCardComponent,
    FilterPanelComponent,
    EmptyStateComponent,
    BreadcrumbComponent,
    ProgressBarComponent,
    IconComponent,
  ],
  templateUrl: './subject-detail.html',
  styleUrl: './subject-detail.scss',
})
export class SubjectDetailComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly metricsService = inject(MetricsService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  subjectId = input.required<string>();

  readonly subject = toSignal(
    toObservable(this.subjectId).pipe(
      switchMap((id) => this.contentService.getSubject(id)),
    ),
    { initialValue: undefined },
  );

  readonly metrics = computed(() => {
    const subject = this.subject();
    return subject ? this.metricsService.computeSubjectMetrics(subject) : undefined;
  });

  readonly filter = signal<TopicFilter>({});

  readonly hasActiveFilter = computed(() => {
    const filter = this.filter();
    return !!(
      filter.searchTerm?.trim() ||
      (filter.difficulty && filter.difficulty !== 'all') ||
      (filter.priority && filter.priority !== 'all') ||
      (filter.status && filter.status !== 'all') ||
      filter.bookmarked
    );
  });

  readonly filteredCategories = computed(() => {
    const subject = this.subject();
    if (!subject) return [];

    const filter = this.filter();
    const progress = this.progressStore.progress();
    const bookmarkedIds = this.bookmarkService.bookmarkedTopicIds();
    const term = (filter.searchTerm ?? '').trim().toLowerCase();

    return subject.categories
      .map((category) => {
        const topics = category.topics.filter((topic) => this.matches(topic, filter, term, progress, bookmarkedIds));
        return { category, topics };
      })
      .filter((entry) => entry.topics.length > 0);
  });

  private readonly expandedCategoryIds = signal<ReadonlySet<string>>(new Set());

  goBack(): void {
    if (hasInAppHistory()) {
      this.location.back();
    } else {
      this.router.navigate(['/subjects']);
    }
  }

  isCategoryOpen(categoryId: string): boolean {
    return this.hasActiveFilter() || this.expandedCategoryIds().has(categoryId);
  }

  toggleCategory(categoryId: string): void {
    const current = this.expandedCategoryIds();
    const next = new Set(current);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    this.expandedCategoryIds.set(next);
  }

  statusFor(topicId: string) {
    return this.progressStore.progress()[topicId]?.status ?? 'not-started';
  }

  categoryCompletion(category: Category): { completed: number; total: number; percentage: number } {
    const progress = this.progressStore.progress();
    const total = category.topics.length;
    const completed = category.topics.filter(
      (topic) => progress[topic.id]?.status === 'completed',
    ).length;
    return { completed, total, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
  }

  isBookmarked(topicId: string): boolean {
    return this.bookmarkService.isTopicBookmarked(topicId);
  }

  private matches(
    topic: TopicSummary,
    filter: TopicFilter,
    term: string,
    progress: Record<string, TopicProgress>,
    bookmarkedIds: Set<string>,
  ): boolean {
    if (filter.difficulty && filter.difficulty !== 'all' && topic.difficulty !== filter.difficulty) {
      return false;
    }
    if (filter.priority && filter.priority !== 'all' && topic.interviewPriority !== filter.priority) {
      return false;
    }
    const status = progress[topic.id]?.status ?? 'not-started';
    if (filter.status && filter.status !== 'all' && status !== filter.status) {
      return false;
    }
    if (filter.bookmarked && !bookmarkedIds.has(topic.id)) {
      return false;
    }
    if (term) {
      const haystack = `${topic.title} ${topic.description} ${topic.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  }
}
