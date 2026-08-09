import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  AchievementCategory,
} from '../../core/models';
import { AchievementsService } from '../../core/services/achievements.service';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-achievements',
  imports: [RouterLink, IconComponent],
  templateUrl: './achievements.html',
  styleUrl: './achievements.scss',
})
export class AchievementsComponent {
  private readonly achievementsService = inject(AchievementsService);

  readonly items = this.achievementsService.items;
  readonly unlockedCount = this.achievementsService.unlockedCount;
  readonly totalCount = this.achievementsService.totalCount;

  readonly progressPct = computed(() =>
    this.totalCount === 0 ? 0 : Math.round((this.unlockedCount() / this.totalCount) * 100),
  );

  readonly grouped = computed(() => {
    const categories: AchievementCategory[] = ['momentum', 'consistency', 'practice', 'identity'];
    return categories.map((category) => ({
      category,
      label: ACHIEVEMENT_CATEGORY_LABELS[category],
      items: this.items().filter((item) => item.category === category),
    }));
  });

  formatDate(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
