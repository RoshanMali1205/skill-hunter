import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, Subject } from '../../core/models';
import { ActivityService } from '../../core/services/activity.service';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { SettingsService } from '../../core/services/settings.service';
import { CalendarComponent } from './calendar';

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [
    {
      id: 'modern',
      subjectId: 'angular',
      title: 'Modern',
      order: 1,
      topics: [
        {
          id: 'signals',
          categoryId: 'modern',
          title: 'Signals',
          description: '',
          difficulty: 'beginner',
          interviewPriority: 'high',
          tags: [],
        },
      ],
    },
  ],
};

describe('CalendarComponent', () => {
  const activity = signal<Record<string, number>>({ '2026-08-20': 600 });
  const settings = signal({ ...DEFAULT_SETTINGS, dailyGoalMinutes: 20 });
  const setDailyGoalMinutes = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20, 12));
    setDailyGoalMinutes.mockReset();
    TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivityService,
          useValue: {
            activity,
            todayMinutes: signal(10),
            weekMinutes: signal(30),
            currentStreak: signal(6),
            longestStreak: signal(10),
            minutesOn: (key: string) => Math.round((activity()[key] ?? 0) / 60),
          },
        },
        { provide: SettingsService, useValue: { settings, setDailyGoalMinutes } },
        {
          provide: ProgressStore,
          useValue: { getTopicProgress: () => ({ completedAt: '2026-08-20T09:00:00.000Z' }) },
        },
        { provide: ContentService, useValue: { getSubjects: () => of([subject]) } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function create() {
    return TestBed.createComponent(CalendarComponent).componentInstance;
  }

  it('computes goal progress, milestones, and heatmap structures', () => {
    const component = create();
    expect(component.goalPercentage()).toBe(50);
    expect(component.nextMilestone()).toBe(7);
    expect(component.heatmapWeeks()).toHaveLength(18);
    expect(component.heatmapWeeks().every((week) => week.length === 7)).toBe(true);
    expect(component.monthGrid()).toHaveLength(42);
  });

  it('navigates months and toggles selected days', () => {
    const component = create();
    expect(component.monthCursor().getMonth()).toBe(7);
    component.prevMonth();
    expect(component.monthCursor().getMonth()).toBe(6);
    component.nextMonth();
    expect(component.monthCursor().getMonth()).toBe(7);
    component.selectDay('2026-08-20');
    expect(component.selectedDayMinutes()).toBe(10);
    expect(component.selectedDayTopics()[0]).toMatchObject({
      subjectId: 'angular',
      completed: true,
    });
    component.selectDay('2026-08-20');
    expect(component.selectedDay()).toBeNull();
  });

  it('clamps daily goals between five and 240 minutes', () => {
    const component = create();
    component.setGoal(2);
    component.setGoal(300);
    component.setGoal(20.6);
    expect(setDailyGoalMinutes.mock.calls.map(([value]) => value)).toEqual([5, 240, 21]);
  });
});
