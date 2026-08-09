import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { ProgressStore } from '../../core/services/progress.store';
import { MetricsService } from '../../core/services/metrics.service';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ActivityService } from '../../core/services/activity.service';
import { ProfileService } from '../../core/services/profile.service';
import { AchievementsService } from '../../core/services/achievements.service';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar';
import { DonutChartComponent } from '../../shared/components/donut-chart/donut-chart';
import { BarChartComponent } from '../../shared/components/bar-chart/bar-chart';
import { DifficultyChipComponent } from '../../shared/components/difficulty-chip/difficulty-chip';
import { IconComponent } from '../../shared/components/icon/icon';
import { ProfileCardComponent } from '../../shared/components/profile-card/profile-card';
import { subjectVisual } from '../../shared/subject-visuals';
import { Subject, TopicSummary } from '../../core/models';

function findTopic(
  subjects: Subject[],
  topicId: string,
): { subjectId: string; topic: TopicSummary } | undefined {
  for (const subject of subjects) {
    for (const category of subject.categories) {
      const topic = category.topics.find((t) => t.id === topicId);
      if (topic) return { subjectId: subject.id, topic };
    }
  }
  return undefined;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    ProgressBarComponent,
    DonutChartComponent,
    BarChartComponent,
    DifficultyChipComponent,
    IconComponent,
    ProfileCardComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly contentService = inject(ContentService);
  private readonly progressStore = inject(ProgressStore);
  private readonly metricsService = inject(MetricsService);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly activityService = inject(ActivityService);
  private readonly profileService = inject(ProfileService);
  private readonly achievementsService = inject(AchievementsService);

  readonly subjectVisual = subjectVisual;
  readonly currentStreak = this.activityService.currentStreak;
  readonly todayMinutes = this.activityService.todayMinutes;
  readonly displayName = this.profileService.displayName;
  readonly firstName = this.profileService.firstName;
  readonly photoDataUrl = this.profileService.photoDataUrl;
  readonly unlockedAchievements = this.achievementsService.unlockedCount;
  readonly totalAchievements = this.achievementsService.totalCount;
  readonly recentAchievements = this.achievementsService.recentlyUnlocked;

  private readonly subjects = toSignal(this.contentService.getSubjects(), { initialValue: [] });

  readonly metrics = computed(() => this.metricsService.computeDashboardMetrics(this.subjects()));

  readonly subjectMetrics = computed(() =>
    this.subjects().map((s) => this.metricsService.computeSubjectMetrics(s)),
  );

  readonly weakTopics = computed(() => this.metricsService.computeWeakTopics(this.subjects()).slice(0, 5));

  readonly statusSegments = computed(() => {
    const m = this.metrics();
    const notStarted = Math.max(0, m.totalTopics - m.completedTopics - m.inProgressTopics);
    return [
      { label: 'Completed', value: m.completedTopics, color: 'var(--color-success)' },
      { label: 'In Progress', value: m.inProgressTopics, color: 'var(--color-primary)' },
      { label: 'Not Started', value: notStarted, color: 'var(--color-border)' },
    ];
  });

  readonly difficultyRows = computed(() => {
    const progress = this.progressStore.progress();
    const totals = { beginner: 0, intermediate: 0, advanced: 0 };
    const completed = { beginner: 0, intermediate: 0, advanced: 0 };
    for (const subject of this.subjects()) {
      for (const category of subject.categories) {
        for (const topic of category.topics) {
          totals[topic.difficulty]++;
          if (progress[topic.id]?.status === 'completed') {
            completed[topic.difficulty]++;
          }
        }
      }
    }
    return [
      {
        label: 'Beginner',
        value: completed.beginner,
        total: totals.beginner,
        color: 'var(--color-difficulty-beginner)',
      },
      {
        label: 'Intermediate',
        value: completed.intermediate,
        total: totals.intermediate,
        color: 'var(--color-difficulty-intermediate)',
      },
      {
        label: 'Advanced',
        value: completed.advanced,
        total: totals.advanced,
        color: 'var(--color-difficulty-advanced)',
      },
    ];
  });

  readonly continueLearning = computed(() => {
    const recent = this.progressStore.recentlyVisited()[0];
    if (!recent) return undefined;

    for (const subject of this.subjects()) {
      for (const category of subject.categories) {
        const topic = category.topics.find((t) => t.id === recent.topicId);
        if (topic) {
          return { subjectId: subject.id, subjectTitle: subject.title, topic };
        }
      }
    }
    return undefined;
  });

  readonly recentBookmarks = computed(() => {
    const subjects = this.subjects();
    return this.bookmarkService
      .bookmarks()
      .filter((b) => b.entityType === 'topic')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
      .map((b) => ({ bookmark: b, resolved: findTopic(subjects, b.topicId) }))
      .filter((entry) => !!entry.resolved);
  });

  readonly strongCategories = computed(() =>
    this.subjectMetrics()
      .flatMap((sm) => sm.categories.map((cm) => ({ subjectTitle: sm.subject.title, ...cm })))
      .filter((cm) => cm.total > 0 && cm.percentage >= 80),
  );

  readonly mostRevisedTopics = computed(() => {
    const subjects = this.subjects();
    return Object.values(this.progressStore.progress())
      .filter((p) => p.revisionCount > 0)
      .sort((a, b) => b.revisionCount - a.revisionCount)
      .slice(0, 5)
      .map((p) => ({ progress: p, resolved: findTopic(subjects, p.topicId) }))
      .filter((entry) => !!entry.resolved);
  });

  readonly recentlyStudied = computed(() => {
    const subjects = this.subjects();
    return this.progressStore
      .recentlyVisited()
      .slice(0, 5)
      .map((p) => ({ progress: p, resolved: findTopic(subjects, p.topicId) }))
      .filter((entry) => !!entry.resolved);
  });
}
