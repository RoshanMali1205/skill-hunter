import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AchievementView, AchievementsService } from '../../core/services/achievements.service';
import { AchievementsComponent } from './achievements';

describe('AchievementsComponent', () => {
  const items = signal<AchievementView[]>([
    {
      id: 'first-steps',
      title: 'First Steps',
      description: 'Complete your first topic.',
      icon: 'play',
      category: 'momentum',
      unlocked: true,
      unlockedAt: '2026-08-20T12:00:00.000Z',
    },
    {
      id: 'streak-3',
      title: 'Warming Up',
      description: 'Study 3 days in a row.',
      icon: 'flame',
      category: 'consistency',
      unlocked: false,
    },
  ]);
  const unlockedCount = signal(1);
  const achievements = { items, unlockedCount, totalCount: 4 };

  beforeEach(() => {
    achievements.totalCount = 4;
    unlockedCount.set(1);
    TestBed.configureTestingModule({
      imports: [AchievementsComponent],
      providers: [provideRouter([]), { provide: AchievementsService, useValue: achievements }],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(AchievementsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('groups badges and rounds unlock progress', () => {
    const component = create().componentInstance;
    expect(component.progressPct()).toBe(25);
    expect(component.grouped().map((group) => group.label)).toEqual([
      'Momentum',
      'Consistency',
      'Practice',
      'Identity',
    ]);
    expect(component.grouped()[0]!.items.map((item) => item.id)).toEqual(['first-steps']);
    expect(component.grouped()[2]!.items).toEqual([]);
  });

  it('reports zero progress when no badges exist', () => {
    achievements.totalCount = 0;
    unlockedCount.set(0);
    expect(create().componentInstance.progressPct()).toBe(0);
  });

  it('formats earned dates and renders locked badges', () => {
    const fixture = create();
    expect(fixture.componentInstance.formatDate()).toBe('');
    expect(fixture.componentInstance.formatDate('2026-08-20T12:00:00.000Z')).toContain('2026');
    expect(fixture.nativeElement.textContent).toContain('Earned');
    expect(fixture.nativeElement.textContent).toContain('Locked');
    expect(fixture.nativeElement.textContent).toContain('1');
  });
});
