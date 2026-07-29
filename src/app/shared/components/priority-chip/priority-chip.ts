import { Component, computed, input } from '@angular/core';
import { InterviewPriority } from '../../../core/models';
import { IconComponent } from '../icon/icon';

interface PriorityConfig {
  label: string;
  icon: string;
  filled: boolean;
}

const CONFIG: Record<InterviewPriority, PriorityConfig> = {
  low: { label: 'Low Priority', icon: 'flag', filled: false },
  medium: { label: 'Medium Priority', icon: 'flag', filled: true },
  high: { label: 'High Priority', icon: 'flame', filled: false },
  'must-know': { label: 'Must Know', icon: 'flame', filled: true },
};

@Component({
  selector: 'app-priority-chip',
  imports: [IconComponent],
  templateUrl: './priority-chip.html',
  styleUrl: './priority-chip.scss',
})
export class PriorityChipComponent {
  priority = input.required<InterviewPriority>();

  config = computed(() => CONFIG[this.priority()]);
}
