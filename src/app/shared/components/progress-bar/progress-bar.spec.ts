import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProgressBarComponent } from './progress-bar';

describe('ProgressBarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProgressBarComponent] });
  });

  it('clamps the value and exposes it to assistive tech', () => {
    const fixture = TestBed.createComponent(ProgressBarComponent);
    fixture.componentRef.setInput('percentage', 140);
    fixture.componentRef.setInput('label', 'Angular');
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    expect(fixture.componentInstance.clamped()).toBe(100);
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect(bar.getAttribute('aria-label')).toBe('Angular');
    expect(fixture.nativeElement.textContent).toContain('100%');

    fixture.componentRef.setInput('percentage', -5);
    fixture.componentRef.setInput('label', undefined);
    fixture.detectChanges();
    expect(fixture.componentInstance.clamped()).toBe(0);
    expect(bar.getAttribute('aria-label')).toBe('Progress');
  });
});
