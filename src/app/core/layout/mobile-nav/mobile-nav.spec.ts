import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
