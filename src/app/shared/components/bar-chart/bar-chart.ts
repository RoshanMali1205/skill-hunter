import { Component, computed, input } from '@angular/core';

export interface BarChartRow {
  label: string;
  value: number;
  color: string;
  total?: number;
}

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
})
export class BarChartComponent {
  rows = input.required<BarChartRow[]>();
  unit = input<string>('');

  readonly maxValue = computed(() => Math.max(1, ...this.rows().map((r) => r.total ?? r.value)));

  widthFor(row: BarChartRow): number {
    const denominator = row.total ?? this.maxValue();
    if (denominator === 0) return 0;
    return Math.round((row.value / denominator) * 100);
  }

  valueLabel(row: BarChartRow): string {
    return row.total !== undefined ? `${row.value} / ${row.total}` : `${row.value}${this.unit()}`;
  }
}
