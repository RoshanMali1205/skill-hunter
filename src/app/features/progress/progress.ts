import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { MetricsService } from '../../core/services/metrics.service';
import { Subject, TopicSummary } from '../../core/models';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar';

function findTopic(subjects: Subject[], topicId: string): { subjectId: string; topic: TopicSummary } | undefined {
  for (const subject of subjects) {
    for (const category of subject.categories) {
      const topic = category.topics.find((t) => t.id === topicId);
      if (topic) return { subjectId: subject.id, topic };
    }
  }
  return undefined;
}

@Component({
  selector: 'app-progress-page',
  imports: [RouterLink, ProgressBarComponent],
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
})
export class ProgressComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly metricsService = inject(MetricsService);

  private readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly metrics = computed(() => this.metricsService.computeDashboardMetrics(this.subjects()));

  readonly subjectMetrics = computed(() =>
    this.subjects().map((s) => this.metricsService.computeSubjectMetrics(s)),
  );

  readonly strongCategories = computed(() =>
    this.subjectMetrics()
      .flatMap((sm) => sm.categories.map((cm) => ({ subjectTitle: sm.subject.title, ...cm })))
      .filter((cm) => cm.total > 0 && cm.percentage >= 80),
  );

  readonly weakTopics = computed(() => this.metricsService.computeWeakTopics(this.subjects()));

  readonly mostRevisedTopics = computed(() => {
    const subjects = this.subjects();
    return Object.values(this.progressStore.progress())
      .filter((p) => p.revisionCount > 0)
      .sort((a, b) => b.revisionCount - a.revisionCount)
      .slice(0, 5)
      .map((p) => ({ progress: p, resolved: findTopic(subjects, p.topicId) }))
      .filter((entry) => !!entry.resolved);
  });

  readonly recentlyStudied = computed(() => {
    const subjects = this.subjects();
    return this.progressStore
      .recentlyVisited()
      .slice(0, 5)
      .map((p) => ({ progress: p, resolved: findTopic(subjects, p.topicId) }))
      .filter((entry) => !!entry.resolved);
  });
}
