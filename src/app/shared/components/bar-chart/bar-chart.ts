import { Component, computed, input } from '@angular/core';

export interface BarChartRow {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
})
export class BarChartComponent {
  rows = input.required<BarChartRow[]>();
  unit = input<string>('');

  readonly maxValue = computed(() => Math.max(1, ...this.rows().map((r) => r.value)));

  widthFor(value: number): number {
    return Math.round((value / this.maxValue()) * 100);
  }
}
