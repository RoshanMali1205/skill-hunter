import { Injectable, inject } from '@angular/core';
import { ProgressStore } from './progress.store';
import { BookmarkService } from './bookmark.service';
import { PracticeService } from './practice.service';
import { RevisionService } from './revision.service';
import { Category, Subject, TopicSummary } from '../models';
import { DashboardMetrics } from '../models/filters.models';

export interface CategoryMetrics {
  category: Category;
  completed: number;
  total: number;
  percentage: number;
}

export interface SubjectMetrics {
  subject: Subject;
  completed: number;
  total: number;
  percentage: number;
  categories: CategoryMetrics[];
}

export interface WeakTopic {
  topic: TopicSummary;
  subjectId: string;
  reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly progressStore = inject(ProgressStore);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly practiceService = inject(PracticeService);
  private readonly revisionService = inject(RevisionService);

  computeCategoryMetrics(category: Category): CategoryMetrics {
    const progress = this.progressStore.progress();
    const total = category.topics.length;
    const completed = category.topics.filter(
      (t) => progress[t.id]?.status === 'completed',
    ).length;
    return {
      category,
      completed,
      total,
      percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }

  computeSubjectMetrics(subject: Subject): SubjectMetrics {
    const categories = subject.categories.map((c) => this.computeCategoryMetrics(c));
    const total = categories.reduce((sum, c) => sum + c.total, 0);
    const completed = categories.reduce((sum, c) => sum + c.completed, 0);
    return {
      subject,
      completed,
      total,
      percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
      categories,
    };
  }

  computeDashboardMetrics(subjects: Subject[]): DashboardMetrics {
    const subjectMetrics = subjects.map((s) => this.computeSubjectMetrics(s));
    const totalTopics = subjectMetrics.reduce((sum, s) => sum + s.total, 0);
    const completedTopics = subjectMetrics.reduce((sum, s) => sum + s.completed, 0);

    return {
      totalTopics,
      completedTopics,
      inProgressTopics: this.progressStore.inProgressCount(),
      completionPercentage: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
      bookmarkedTopics: this.bookmarkService.bookmarkedTopicIds().size,
      revisionTopics: this.revisionService.revisionTopicIds().length,
      questionsAttempted: this.practiceService.questionsAttempted(),
      correctAnswers: this.practiceService.correctAnswers(),
      practiceAccuracy: this.practiceService.accuracy(),
    };
  }

  computeWeakTopics(subjects: Subject[]): WeakTopic[] {
    const lowConfidence = new Set(this.progressStore.lowConfidenceTopicIds());
    const incorrect = this.practiceService.incorrectTopicIds();
    const manualRevision = new Set(this.revisionService.revisionTopicIds());
    const bookmarked = this.bookmarkService.bookmarkedTopicIds();

    const weak: WeakTopic[] = [];

    for (const subject of subjects) {
      for (const category of subject.categories) {
        for (const topic of category.topics) {
          const reasons: string[] = [];
          if (lowConfidence.has(topic.id)) reasons.push('Low confidence');
          if (incorrect.has(topic.id)) reasons.push('Incorrect practice attempt');
          if (manualRevision.has(topic.id)) reasons.push('Added to revision');
          if (bookmarked.has(topic.id)) reasons.push('Bookmarked');

          if (reasons.length > 0) {
            weak.push({ topic, subjectId: subject.id, reasons });
          }
        }
      }
    }

    return weak;
  }
}
