import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { MetricsService } from '../../core/services/metrics.service';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar';
import { DonutChartComponent } from '../../shared/components/donut-chart/donut-chart';
import { BarChartComponent } from '../../shared/components/bar-chart/bar-chart';
import { subjectVisual } from '../../shared/subject-visuals';
import { Subject, TopicSummary } from '../../core/models';

function findTopic(
  subjects: Subject[],
  topicId: string,
): { subjectId: string; topic: TopicSummary } | undefined {
  for (const subject of subjects) {
    for (const category of subject.categories) {
      const topic = category.topics.find((t) => t.id === topicId);
      if (topic) return { subjectId: subject.id, topic };
    }
  }
  return undefined;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ProgressBarComponent, DonutChartComponent, BarChartComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly metricsService = inject(MetricsService);

  readonly subjectVisual = subjectVisual;

  private readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly metrics = computed(() => this.metricsService.computeDashboardMetrics(this.subjects()));

  readonly subjectMetrics = computed(() =>
    this.subjects().map((s) => this.metricsService.computeSubjectMetrics(s)),
  );

  readonly weakTopics = computed(() => this.metricsService.computeWeakTopics(this.subjects()).slice(0, 5));

  readonly statusSegments = computed(() => {
    const m = this.metrics();
    const notStarted = Math.max(0, m.totalTopics - m.completedTopics - m.inProgressTopics);
    return [
      { label: 'Completed', value: m.completedTopics, color: 'var(--color-success)' },
      { label: 'In Progress', value: m.inProgressTopics, color: 'var(--color-primary)' },
      { label: 'Not Started', value: notStarted, color: 'var(--color-border)' },
    ];
  });

  readonly difficultyRows = computed(() => {
    const counts = { beginner: 0, intermediate: 0, advanced: 0 };
    for (const subject of this.subjects()) {
      for (const category of subject.categories) {
        for (const topic of category.topics) {
          counts[topic.difficulty]++;
        }
      }
    }
    return [
      { label: 'Beginner', value: counts.beginner, color: 'var(--color-difficulty-beginner)' },
      { label: 'Intermediate', value: counts.intermediate, color: 'var(--color-difficulty-intermediate)' },
      { label: 'Advanced', value: counts.advanced, color: 'var(--color-difficulty-advanced)' },
    ];
  });

  readonly continueLearning = computed(() => {
    const recent = this.progressStore.recentlyVisited()[0];
    if (!recent) return undefined;

    for (const subject of this.subjects()) {
      for (const category of subject.categories) {
        const topic = category.topics.find((t) => t.id === recent.topicId);
        if (topic) {
          return { subjectId: subject.id, topic };
        }
      }
    }
    return undefined;
  });

  readonly strongCategories = computed(() =>
    this.subjectMetrics()
      .flatMap((sm) => sm.categories.map((cm) => ({ subjectTitle: sm.subject.title, ...cm })))
      .filter((cm) => cm.total > 0 && cm.percentage >= 80),
  );

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
