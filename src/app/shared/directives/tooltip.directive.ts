import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  input,
} from '@angular/core';

type TooltipPos = 'top' | 'bottom' | 'right';
type TooltipAlign = 'center' | 'end';

/**
 * Fixed-position tooltip that escapes overflow containers (sidebar, cards)
 * and stays inside the viewport.
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '[attr.aria-describedby]': 'describedBy',
  },
})
export class TooltipDirective implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly appTooltip = input.required<string>();
  readonly tooltipPos = input<TooltipPos>('top');
  readonly tooltipAlign = input<TooltipAlign>('center');

  private tipEl: HTMLDivElement | null = null;
  private tipId = `tip-${Math.random().toString(36).slice(2, 9)}`;

  get describedBy(): string | null {
    return this.tipEl ? this.tipId : null;
  }

  @HostListener('mouseenter')
  @HostListener('focus')
  show(): void {
    const text = this.appTooltip()?.trim();
    if (!text || this.tipEl) return;

    const tip = document.createElement('div');
    tip.id = this.tipId;
    tip.className = 'app-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.dataset['pos'] = this.tooltipPos();
    tip.textContent = text;
    document.body.appendChild(tip);
    this.tipEl = tip;
    this.place(tip);
    requestAnimationFrame(() => tip.classList.add('app-tooltip--visible'));
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  hide(): void {
    if (!this.tipEl) return;
    this.tipEl.remove();
    this.tipEl = null;
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.tipEl) this.place(this.tipEl);
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private place(tip: HTMLDivElement): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 10;
    const pad = 8;
    const pos = this.tooltipPos();
    const align = this.tooltipAlign();

    let top = 0;
    let left = 0;

    if (pos === 'right') {
      top = rect.top + rect.height / 2 - tipRect.height / 2;
      left = rect.right + gap;
    } else if (pos === 'bottom') {
      top = rect.bottom + gap;
      left =
        align === 'end'
          ? rect.right - tipRect.width
          : rect.left + rect.width / 2 - tipRect.width / 2;
    } else {
      top = rect.top - tipRect.height - gap;
      left =
        align === 'end'
          ? rect.right - tipRect.width
          : rect.left + rect.width / 2 - tipRect.width / 2;
    }

    left = Math.min(Math.max(pad, left), window.innerWidth - tipRect.width - pad);
    top = Math.min(Math.max(pad, top), window.innerHeight - tipRect.height - pad);

    tip.style.top = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;

    // Point arrow toward the trigger center when possible.
    const triggerCenterX = rect.left + rect.width / 2;
    const arrowX = Math.min(
      Math.max(12, triggerCenterX - left),
      tipRect.width - 12,
    );
    tip.style.setProperty('--arrow-x', `${Math.round(arrowX)}px`);
  }
}
