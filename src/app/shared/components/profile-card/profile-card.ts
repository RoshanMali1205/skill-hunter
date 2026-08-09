import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-profile-card',
  imports: [RouterLink, IconComponent, TooltipDirective],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
})
export class ProfileCardComponent {
  name = input.required<string>();
  photoDataUrl = input<string | null>(null);
  percentage = input(0);
  completedTopics = input(0);
  totalTopics = input(0);
  streak = input(0);
  unlockedAchievements = input(0);
  totalAchievements = input(0);

  readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );

  readonly clampedPercentage = computed(() =>
    Math.max(0, Math.min(100, Math.round(this.percentage()))),
  );

  /** SVG circle progress — circumference of r=54. */
  readonly ringOffset = computed(() => {
    const circumference = 2 * Math.PI * 54;
    return circumference * (1 - this.clampedPercentage() / 100);
  });
}
