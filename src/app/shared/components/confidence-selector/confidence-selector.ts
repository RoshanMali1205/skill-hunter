import { Component, input, output } from '@angular/core';
import { ConfidenceLevel } from '../../../core/models';
import { IconComponent } from '../icon/icon';

interface ConfidenceOption {
  value: ConfidenceLevel;
  label: string;
  color: string;
}

const OPTIONS: ConfidenceOption[] = [
  { value: 'low', label: 'Low', color: 'var(--color-danger)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-warning)' },
  { value: 'high', label: 'High', color: 'var(--color-success)' },
];

@Component({
  selector: 'app-confidence-selector',
  imports: [IconComponent],
  templateUrl: './confidence-selector.html',
  styleUrl: './confidence-selector.scss',
})
export class ConfidenceSelectorComponent {
  confidence = input.required<ConfidenceLevel>();
  changed = output<ConfidenceLevel>();

  readonly options = OPTIONS;
}
