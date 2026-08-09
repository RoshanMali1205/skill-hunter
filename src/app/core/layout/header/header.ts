import {
  Component,
  computed,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { IconComponent } from '../../../shared/components/icon/icon';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ActivityService } from '../../services/activity.service';
import { AchievementsService } from '../../services/achievements.service';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';
import { SearchComponent } from '../search/search';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    ThemeToggleComponent,
    IconComponent,
    TooltipDirective,
    SearchComponent,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly activityService = inject(ActivityService);
  private readonly achievementsService = inject(AchievementsService);
  private readonly search = viewChild(SearchComponent);

  readonly user = this.authService.user;
  readonly displayName = this.profileService.displayName;
  readonly photoDataUrl = this.profileService.photoDataUrl;
  readonly currentStreak = this.activityService.currentStreak;
  readonly todayMinutes = this.activityService.todayMinutes;
  readonly unlockedCount = this.achievementsService.unlockedCount;
  readonly totalAchievements = this.achievementsService.totalCount;

  readonly menuOpen = signal(false);
  readonly mobileSearchOpen = signal(false);

  readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );

  readonly streakLabel = computed(() => {
    const streak = this.currentStreak();
    return `${streak} day${streak === 1 ? '' : 's'}`;
  });

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openMobileSearch(): void {
    this.mobileSearchOpen.set(true);
    this.closeMenu();
    queueMicrotask(() => this.search()?.focusSearch());
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen.set(false);
    this.search()?.clearAndBlur();
  }

  onSearchClosed(): void {
    if (this.mobileSearchOpen()) {
      this.mobileSearchOpen.set(false);
    }
  }

  focusDesktopSearch(): void {
    this.search()?.focusSearch();
  }

  logout(): void {
    this.authService.logout();
    // Hard redirect (not router.navigate) so every root-scoped store
    // resets and re-reads fresh on the next login, instead of holding
    // this session's data in memory. replace() also drops the protected
    // page from history so Back doesn't revive a logged-out session view.
    window.location.replace('/login');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }
    if (this.mobileSearchOpen()) {
      this.closeMobileSearch();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if (!this.user()) return;
    if (event.defaultPrevented || event.altKey) return;

    const target = event.target as HTMLElement | null;
    if (this.isTypingTarget(target)) return;

    const key = event.key;
    const wantsSearch =
      key === '/' ||
      ((event.ctrlKey || event.metaKey) && (key === 'k' || key === 'K'));

    if (!wantsSearch) return;

    event.preventDefault();
    if (window.matchMedia('(min-width: 768px)').matches) {
      this.focusDesktopSearch();
    } else {
      this.openMobileSearch();
    }
  }

  private isTypingTarget(target: HTMLElement | null): boolean {
    if (!target) return false;
    const tag = target.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target.isContentEditable
    );
  }
}
