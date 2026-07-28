import { Component, computed, input } from '@angular/core';
import { InterviewPriority } from '../../../core/models';

const LABELS: Record<InterviewPriority, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
  'must-know': 'Must Know',
};

@Component({
  selector: 'app-priority-chip',
  templateUrl: './priority-chip.html',
  styleUrl: './priority-chip.scss',
})
export class PriorityChipComponent {
  priority = input.required<InterviewPriority>();

  label = computed(() => LABELS[this.priority()]);
}
