import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { MetricsService } from '../../core/services/metrics.service';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ProgressBarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly metricsService = inject(MetricsService);

  private readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly metrics = computed(() => this.metricsService.computeDashboardMetrics(this.subjects()));

  readonly subjectMetrics = computed(() =>
    this.subjects().map((s) => this.metricsService.computeSubjectMetrics(s)),
  );

  readonly weakTopics = computed(() => this.metricsService.computeWeakTopics(this.subjects()).slice(0, 5));

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
}
