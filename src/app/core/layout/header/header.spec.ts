import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AchievementsService } from '../../services/achievements.service';
import { ActivityService } from '../../services/activity.service';
import { AuthService } from '../../services/auth.service';
import { ContentService } from '../../services/content.service';
import { ProfileService } from '../../services/profile.service';
import { SettingsService } from '../../services/settings.service';
import { HeaderComponent } from './header';

describe('HeaderComponent', () => {
  const user = signal<{ id: string; name: string } | null>({ id: 'u1', name: 'Ada' });

  beforeEach(() => {
    user.set({ id: 'u1', name: 'Ada' });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user, logout: vi.fn() } },
        {
          provide: ProfileService,
          useValue: { displayName: signal('Ada Lovelace'), photoDataUrl: signal(null) },
        },
        {
          provide: ActivityService,
          useValue: { currentStreak: signal(1), todayMinutes: signal(20) },
        },
        { provide: AchievementsService, useValue: { unlockedCount: signal(2), totalCount: 10 } },
        { provide: ContentService, useValue: { search: () => [] } },
        {
          provide: SettingsService,
          useValue: { settings: signal({ theme: 'light' }), toggleTheme: vi.fn() },
        },
      ],
    });
  });

  function create() {
    return TestBed.createComponent(HeaderComponent).componentInstance;
  }

  it('derives avatar initials and singular/plural streak labels', () => {
    const component = create();
    expect(component.initials()).toBe('AL');
    expect(component.streakLabel()).toBe('1 day');
  });

  it('toggles menus and gives Escape priority to the profile menu', () => {
    const component = create();
    component.toggleMenu();
    component.mobileSearchOpen.set(true);
    component.onEscape();
    expect(component.menuOpen()).toBe(false);
    expect(component.mobileSearchOpen()).toBe(true);
    component.onEscape();
    expect(component.mobileSearchOpen()).toBe(false);
  });

  it('opens mobile search for slash and ignores typing targets', () => {
    const component = create();
    const shortcut = new KeyboardEvent('keydown', { key: '/' });
    component.onGlobalKeydown(shortcut);
    expect(component.mobileSearchOpen()).toBe(true);
    component.closeMobileSearch();

    const typing = new KeyboardEvent('keydown', { key: '/' });
    Object.defineProperty(typing, 'target', { value: document.createElement('input') });
    component.onGlobalKeydown(typing);
    expect(component.mobileSearchOpen()).toBe(false);
  });

  it('ignores global shortcuts for signed-out users', () => {
    user.set(null);
    const component = create();
    component.onGlobalKeydown(new KeyboardEvent('keydown', { key: '/' }));
    expect(component.mobileSearchOpen()).toBe(false);
  });
});
