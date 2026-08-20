import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipDirective } from './tooltip.directive';

@Component({
  imports: [TooltipDirective],
  template: `<button appTooltip="Helpful text" tooltipPos="bottom">Help</button>`,
})
class TooltipHostComponent {}

describe('TooltipDirective', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    document.querySelectorAll('.app-tooltip').forEach((node) => node.remove());
    vi.unstubAllGlobals();
  });

  it('creates an accessible tooltip on hover and removes it on leave', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TooltipHostComponent],
    }).createComponent(TooltipHostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    const tooltip = document.querySelector('.app-tooltip') as HTMLElement;
    expect(tooltip.textContent).toBe('Helpful text');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);

    button.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(document.querySelector('.app-tooltip')).toBeNull();
  });

  it('suppresses tooltips on non-hover devices', () => {
    (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({ matches: false });
    const fixture = TestBed.configureTestingModule({
      imports: [TooltipHostComponent],
    }).createComponent(TooltipHostComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').dispatchEvent(new MouseEvent('mouseenter'));
    expect(document.querySelector('.app-tooltip')).toBeNull();
  });
});
