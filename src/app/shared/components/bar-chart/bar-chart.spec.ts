import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BarChartComponent } from './bar-chart';

describe('BarChartComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [BarChartComponent] }));

  it('computes widths against explicit totals or the largest value', () => {
    const fixture = TestBed.createComponent(BarChartComponent);
    fixture.componentRef.setInput('rows', [
      { label: 'A', value: 5, total: 10, color: 'red' },
      { label: 'B', value: 4, color: 'blue' },
    ]);
    const component = fixture.componentInstance;
    expect(component.maxValue()).toBe(10);
    expect(component.widthFor(component.rows()[0]!)).toBe(50);
    expect(component.widthFor(component.rows()[1]!)).toBe(40);
  });

  it('formats values with totals or units', () => {
    const fixture = TestBed.createComponent(BarChartComponent);
    fixture.componentRef.setInput('rows', []);
    fixture.componentRef.setInput('unit', ' min');
    expect(fixture.componentInstance.valueLabel({ label: 'A', value: 5, color: 'red' })).toBe(
      '5 min',
    );
    expect(
      fixture.componentInstance.valueLabel({ label: 'A', value: 5, total: 10, color: 'red' }),
    ).toBe('5 / 10');
  });
});
