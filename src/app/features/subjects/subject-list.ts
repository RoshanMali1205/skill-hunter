import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { MetricsService } from '../../core/services/metrics.service';
import { SubjectCardComponent } from '../../shared/components/subject-card/subject-card';
import { groupSubjectsByTrack } from './subject-tracks';

@Component({
  selector: 'app-subject-list',
  imports: [SubjectCardComponent],
  templateUrl: './subject-list.html',
  styleUrl: './subject-list.scss',
})
export class SubjectListComponent {
  private readonly contentService = inject(ContentService);
  private readonly metricsService = inject(MetricsService);

  private readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly subjectMetrics = computed(() =>
    this.subjects().map((s) => this.metricsService.computeSubjectMetrics(s)),
  );

  readonly tracks = computed(() => groupSubjectsByTrack(this.subjectMetrics()));
}
