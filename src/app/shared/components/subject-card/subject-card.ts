import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject } from '../../../core/models';
import { ProgressBarComponent } from '../progress-bar/progress-bar';

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
}
