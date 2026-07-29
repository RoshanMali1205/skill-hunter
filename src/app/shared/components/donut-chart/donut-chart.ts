import { Component, computed, input } from '@angular/core';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
})
export class DonutChartComponent {
  segments = input.required<DonutSegment[]>();
  centerValue = input<string>('');
  centerLabel = input<string>('');

  readonly total = computed(() => this.segments().reduce((sum, s) => sum + s.value, 0));

  readonly gradient = computed(() => {
    const total = this.total();
    if (total === 0) {
      return 'var(--color-surface-alt)';
    }
    let cursor = 0;
    const stops: string[] = [];
    for (const segment of this.segments()) {
      if (segment.value <= 0) continue;
      const start = (cursor / total) * 100;
      cursor += segment.value;
      const end = (cursor / total) * 100;
      stops.push(`${segment.color} ${start}% ${end}%`);
    }
    return stops.length > 0 ? `conic-gradient(${stops.join(', ')})` : 'var(--color-surface-alt)';
  });

  readonly legendItems = computed(() => {
    const total = this.total();
    return this.segments().map((segment) => ({
      ...segment,
      percentage: total === 0 ? 0 : Math.round((segment.value / total) * 100),
    }));
  });
}
