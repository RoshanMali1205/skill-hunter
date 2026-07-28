import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopicStatus, TopicSummary } from '../../../core/models';
import { DifficultyChipComponent } from '../difficulty-chip/difficulty-chip';
import { PriorityChipComponent } from '../priority-chip/priority-chip';

@Component({
  selector: 'app-topic-card',
  imports: [RouterLink, DifficultyChipComponent, PriorityChipComponent],
  templateUrl: './topic-card.html',
  styleUrl: './topic-card.scss',
})
export class TopicCardComponent {
  topic = input.required<TopicSummary>();
  subjectId = input.required<string>();
  status = input<TopicStatus>('not-started');
  bookmarked = input<boolean>(false);
}
