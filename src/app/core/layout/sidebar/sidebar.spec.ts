import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SidebarComponent } from './sidebar';

describe('SidebarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SidebarComponent], providers: [provideRouter([])] });
  });

  it('exposes all primary destinations and the application version', () => {
    const component = TestBed.createComponent(SidebarComponent).componentInstance;
    expect(component.navItems.map((item) => item.path)).toEqual(
      expect.arrayContaining(['/dashboard', '/subjects', '/practice', '/ai-mentor', '/settings']),
    );
    expect(component.navItems).toHaveLength(12);
    expect(component.appVersion).toMatch(/^v?\d+\.\d+/);
  });

  it('renders navigation links with labels', () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBeGreaterThanOrEqual(12);
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).toContain('Settings');
  });
});
