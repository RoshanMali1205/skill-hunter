import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../core/services/activity.service';
import { SettingsService } from '../../core/services/settings.service';
import { ProgressStore } from '../../core/services/progress.store';
import { ContentService } from '../../core/services/content.service';
import { IconComponent } from '../../shared/components/icon/icon';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar';
import { addDays, dateKey } from '../../shared/date-key';
import { TopicSummary } from '../../core/models';

type ActivityLevel = 0 | 1 | 2 | 3 | 4;

interface HeatmapDay {
  key: string;
  date: Date;
  minutes: number;
  level: ActivityLevel;
  inFuture: boolean;
}

interface MonthDay {
  key: string;
  day: number;
  minutes: number;
  level: ActivityLevel;
  isToday: boolean;
  inMonth: boolean;
}

interface SelectedDayTopic {
  subjectId: string;
  topic: TopicSummary;
  completed: boolean;
}

const MILESTONES = [7, 14, 30, 60, 100, 180, 365];
const HEATMAP_WEEKS = 18;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

@Component({
  selector: 'app-calendar',
  imports: [RouterLink, FormsModule, IconComponent, ProgressBarComponent],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class CalendarComponent {
  private readonly activityService = inject(ActivityService);
  private readonly settingsService = inject(SettingsService);
  private readonly progressStore = inject(ProgressStore);
  private readonly contentService = inject(ContentService);

  private readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly weekdayLabelsShort = WEEKDAY_LABELS_SHORT;

  readonly settings = this.settingsService.settings;
  readonly todayMinutes = this.activityService.todayMinutes;
  readonly weekMinutes = this.activityService.weekMinutes;
  readonly currentStreak = this.activityService.currentStreak;
  readonly longestStreak = this.activityService.longestStreak;

  readonly goalPercentage = computed(() => {
    const goal = this.settings().dailyGoalMinutes;
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.todayMinutes() / goal) * 100));
  });

  readonly nextMilestone = computed(() => {
    const streak = this.currentStreak();
    return MILESTONES.find((m) => m > streak) ?? null;
  });

  private levelFor(minutes: number): ActivityLevel {
    if (minutes <= 0) return 0;
    const goal = this.settings().dailyGoalMinutes || 20;
    const ratio = minutes / goal;
    if (ratio < 0.34) return 1;
    if (ratio < 0.67) return 2;
    if (ratio < 1) return 3;
    return 4;
  }

  readonly heatmapWeeks = computed<HeatmapDay[][]>(() => {
    this.activityService.activity();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = addDays(today, 6 - today.getDay());
    const start = addDays(endOfWeek, -(HEATMAP_WEEKS * 7 - 1));
    const alignedStart = addDays(start, -start.getDay());

    const weeks: HeatmapDay[][] = [];
    let cursor = alignedStart;
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const week: HeatmapDay[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dateKey(cursor);
        const minutes = this.activityService.minutesOn(key);
        week.push({
          key,
          date: new Date(cursor),
          minutes,
          level: this.levelFor(minutes),
          inFuture: cursor.getTime() > today.getTime(),
        });
        cursor = addDays(cursor, 1);
      }
      weeks.push(week);
    }
    return weeks;
  });

  readonly monthCursor = signal(new Date());

  readonly monthLabel = computed(() =>
    this.monthCursor().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  readonly monthGrid = computed<MonthDay[]>(() => {
    this.activityService.activity();
    const cursor = this.monthCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
    const today = dateKey();

    const days: MonthDay[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(gridStart, i);
      const key = dateKey(date);
      const minutes = this.activityService.minutesOn(key);
      days.push({
        key,
        day: date.getDate(),
        minutes,
        level: this.levelFor(minutes),
        isToday: key === today,
        inMonth: date.getMonth() === month,
      });
    }
    return days;
  });

  readonly selectedDay = signal<string | null>(null);

  readonly selectedDayLabel = computed(() => {
    const key = this.selectedDay();
    if (!key) return '';
    return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly selectedDayMinutes = computed(() => {
    const key = this.selectedDay();
    return key ? this.activityService.minutesOn(key) : 0;
  });

  readonly selectedDayTopics = computed<SelectedDayTopic[]>(() => {
    const key = this.selectedDay();
    if (!key) return [];

    const results: SelectedDayTopic[] = [];
    for (const subject of this.subjects()) {
      for (const category of subject.categories) {
        for (const topic of category.topics) {
          const progress = this.progressStore.getTopicProgress(topic.id, subject.id);
          const completedThatDay = progress.completedAt?.startsWith(key) ?? false;
          const visitedThatDay = progress.lastVisitedAt?.startsWith(key) ?? false;
          if (completedThatDay || visitedThatDay) {
            results.push({ subjectId: subject.id, topic, completed: completedThatDay });
          }
        }
      }
    }
    return results;
  });

  prevMonth(): void {
    this.monthCursor.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    this.monthCursor.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDay(key: string): void {
    this.selectedDay.update((current) => (current === key ? null : key));
  }

  setGoal(value: number): void {
    const clamped = Math.min(240, Math.max(5, Math.round(value)));
    this.settingsService.setDailyGoalMinutes(clamped);
  }
}
