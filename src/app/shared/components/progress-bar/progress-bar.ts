import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class ProgressBarComponent {
  percentage = input.required<number>();
  label = input<string>();

  clamped = computed(() => Math.min(100, Math.max(0, this.percentage())));
}
