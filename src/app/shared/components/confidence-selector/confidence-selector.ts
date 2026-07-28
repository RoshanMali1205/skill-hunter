import { Component, input, output } from '@angular/core';
import { ConfidenceLevel } from '../../../core/models';

interface ConfidenceOption {
  value: ConfidenceLevel;
  label: string;
  emoji: string;
}

const OPTIONS: ConfidenceOption[] = [
  { value: 'low', label: 'Low', emoji: '🔴' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'high', label: 'High', emoji: '🟢' },
];

@Component({
  selector: 'app-confidence-selector',
  templateUrl: './confidence-selector.html',
  styleUrl: './confidence-selector.scss',
})
export class ConfidenceSelectorComponent {
  confidence = input.required<ConfidenceLevel>();
  changed = output<ConfidenceLevel>();

  readonly options = OPTIONS;
}
