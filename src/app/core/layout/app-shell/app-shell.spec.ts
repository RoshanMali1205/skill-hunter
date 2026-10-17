import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_VERSION } from '../../../shared/app-version';
import { AchievementsService } from '../../services/achievements.service';
import { ActivityService } from '../../services/activity.service';
import { AuthService } from '../../services/auth.service';
import { ContentService } from '../../services/content.service';
import { ProfileService } from '../../services/profile.service';
import { SettingsService } from '../../services/settings.service';
import { AppShellComponent } from './app-shell';

describe('AppShellComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { user: signal({ id: 'u1', name: 'Ada' }), logout: vi.fn() },
        },
        {
          provide: ProfileService,
          useValue: { displayName: signal('Ada Lovelace'), photoDataUrl: signal(null) },
        },
        {
          provide: ActivityService,
          useValue: { currentStreak: signal(1), todayMinutes: signal(20) },
        },
        { provide: AchievementsService, useValue: { unlockedCount: signal(2), totalCount: 10 } },
        { provide: ContentService, useValue: { search: () => of([]) } },
        {
          provide: SettingsService,
          useValue: { settings: signal({ theme: 'light' }), toggleTheme: vi.fn() },
        },
      ],
    });
  });

  it('keeps achievements wired and shows the app version in the footer', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.appVersion).toBe(APP_VERSION);
    expect(fixture.nativeElement.textContent).toContain('Developed by Roshan Mali');
    expect(fixture.nativeElement.textContent).toContain(`v${APP_VERSION}`);
  });
});
