import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject } from '../../../core/models';
import { ProgressBarComponent } from '../progress-bar/progress-bar';
import { subjectVisual } from '../../subject-visuals';

@Component({
  selector: 'app-subject-card',
  imports: [RouterLink, ProgressBarComponent],
  templateUrl: './subject-card.html',
  styleUrl: './subject-card.scss',
})
export class SubjectCardComponent {
  subject = input.required<Subject>();
  completed = input.required<number>();
  total = input.required<number>();
  percentage = input.required<number>();

  readonly visual = computed(() => subjectVisual(this.subject().id));

  /** The first few areas, so the card shows what is inside instead of a clipped paragraph. */
  readonly areas = computed(() =>
    [...this.subject().categories]
      .sort((a, b) => a.order - b.order)
      .slice(0, 3)
      .map((category) => category.title),
  );

  readonly extraAreas = computed(() =>
    Math.max(0, this.subject().categories.length - this.areas().length),
  );
}
