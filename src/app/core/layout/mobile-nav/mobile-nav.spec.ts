import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileNavComponent } from './mobile-nav';

@Component({ template: '' })
class RouteStubComponent {}

describe('MobileNavComponent', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MobileNavComponent],
      providers: [
        provideRouter([
          { path: 'notes', component: RouteStubComponent },
          { path: 'dashboard', component: RouteStubComponent },
        ]),
      ],
    });
    router = TestBed.inject(Router);
  });

  it('exposes primary and overflow navigation items', () => {
    const component = TestBed.createComponent(MobileNavComponent).componentInstance;
    expect(component.navItems).toHaveLength(4);
    expect(component.moreItems.map((item) => item.path)).toContain('/settings');
  });

  it('toggles and closes the overflow menu', () => {
    const component = TestBed.createComponent(MobileNavComponent).componentInstance;
    component.toggleMore();
    expect(component.moreOpen()).toBe(true);
    component.closeMore();
    expect(component.moreOpen()).toBe(false);
  });

  it('marks More active for overflow routes', async () => {
    const component = TestBed.createComponent(MobileNavComponent).componentInstance;
    await router.navigateByUrl('/notes');
    expect(component.moreActive()).toBe(true);
    await router.navigateByUrl('/dashboard');
    expect(component.moreActive()).toBe(false);
  });

  describe('More sheet accessibility', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      document.body.style.overflow = '';
    });

    function open() {
      const fixture = TestBed.createComponent(MobileNavComponent);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const moreButton = root.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement;
      moreButton.click();
      fixture.detectChanges();
      vi.runAllTimers();
      return { fixture, root, moreButton };
    }

    it('is a labelled modal dialog with a visible close button and focuses inside', () => {
      const { root } = open();
      const sheet = root.querySelector('.mobile-nav__sheet') as HTMLElement;
      expect(sheet.getAttribute('role')).toBe('dialog');
      expect(sheet.getAttribute('aria-modal')).toBe('true');
      expect(sheet.querySelector('.mobile-nav__sheet-close')).not.toBeNull();
      expect(sheet.contains(document.activeElement)).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('closes on Escape and returns focus to the More button', () => {
      const { fixture, moreButton } = open();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(fixture.componentInstance.moreOpen()).toBe(false);
      expect(document.activeElement).toBe(moreButton);
    });

    it('keeps Tab inside the sheet', () => {
      const { root } = open();
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('.mobile-nav__sheet button, .mobile-nav__sheet a[href]'),
      );
      items[items.length - 1].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
      expect(document.activeElement).toBe(items[0]);
    });
  });
});
