import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DonutChartComponent } from './donut-chart';

describe('DonutChartComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [DonutChartComponent] }));

  it('computes totals, percentages, and gradient stops', () => {
    const fixture = TestBed.createComponent(DonutChartComponent);
    fixture.componentRef.setInput('segments', [
      { label: 'Done', value: 3, color: 'green' },
      { label: 'Open', value: 1, color: 'gray' },
    ]);
    const component = fixture.componentInstance;
    expect(component.total()).toBe(4);
    expect(component.legendItems().map((item) => item.percentage)).toEqual([75, 25]);
    expect(component.gradient()).toBe('conic-gradient(green 0% 75%, gray 75% 100%)');
  });

  it('uses a neutral background for empty data', () => {
    const fixture = TestBed.createComponent(DonutChartComponent);
    fixture.componentRef.setInput('segments', []);
    expect(fixture.componentInstance.total()).toBe(0);
    expect(fixture.componentInstance.gradient()).toBe('var(--color-surface-alt)');
  });
});
