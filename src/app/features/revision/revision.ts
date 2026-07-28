import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { RevisionService } from '../../core/services/revision.service';
import { MetricsService } from '../../core/services/metrics.service';
import { TopicCardComponent } from '../../shared/components/topic-card/topic-card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-revision',
  imports: [TopicCardComponent, EmptyStateComponent],
  templateUrl: './revision.html',
  styleUrl: './revision.scss',
})
export class RevisionComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly revisionService = inject(RevisionService);
  private readonly metricsService = inject(MetricsService);

  private readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly revisionItems = computed(() => this.metricsService.computeWeakTopics(this.subjects()));

  statusFor(topicId: string) {
    return this.progressStore.progress()[topicId]?.status ?? 'not-started';
  }

  isManuallyAdded(topicId: string): boolean {
    return this.revisionService.isInRevision(topicId);
  }

  completeRevision(topicId: string, subjectId: string): void {
    this.progressStore.incrementRevisionCount(topicId, subjectId);
    this.revisionService.removeFromRevision(topicId);
  }

  removeFromRevisionList(topicId: string): void {
    this.revisionService.removeFromRevision(topicId);
  }
}
