import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from '../../services/settings.service';
import { ThemeToggleComponent } from './theme-toggle';

describe('ThemeToggleComponent', () => {
  const settings = signal({ theme: 'light' as 'light' | 'dark' });
  const toggleTheme = vi.fn();

  beforeEach(() => {
    settings.set({ theme: 'light' });
    toggleTheme.mockClear();
    TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [{ provide: SettingsService, useValue: { settings, toggleTheme } }],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('describes the theme it will switch to and toggles on click', () => {
    const fixture = create();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    expect(toggleTheme).toHaveBeenCalledOnce();

    settings.set({ theme: 'dark' });
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});
