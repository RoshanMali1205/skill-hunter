import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../../../shared/components/icon/icon';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  hint: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/dashboard', icon: 'home', hint: 'Your prep overview' },
  { label: 'Subjects', path: '/subjects', icon: 'book-open', hint: 'Browse interview topics' },
  { label: 'Practice', path: '/practice', icon: 'target', hint: 'Drill interview questions' },
  { label: 'AI Mentor', path: '/ai-mentor', icon: 'bot', hint: 'Ask the interview mentor' },
];

const MORE_ITEMS: NavItem[] = [
  { label: 'Playground', path: '/playground', icon: 'code', hint: 'Try code in the browser' },
  { label: 'Calendar', path: '/calendar', icon: 'calendar', hint: 'Track study activity' },
  { label: 'Bookmarks', path: '/bookmarks', icon: 'bookmark', hint: 'Saved topics & questions' },
  { label: 'Notes', path: '/notes', icon: 'pencil', hint: 'Your study notes' },
  { label: 'Revision', path: '/revision', icon: 'repeat', hint: 'Topics to revisit' },
  { label: 'Achievements', path: '/achievements', icon: 'medal', hint: 'Badges you have earned' },
  { label: 'Settings', path: '/settings', icon: 'settings', hint: 'Profile and preferences' },
];

@Component({
  selector: 'app-mobile-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent, TooltipDirective],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.scss',
})
export class MobileNavComponent {
  private readonly router = inject(Router);

  readonly navItems = NAV_ITEMS;
  readonly moreItems = MORE_ITEMS;
  readonly moreOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Keep More highlighted when viewing Playground / Notes / Settings / etc. */
  readonly moreActive = computed(() => {
    const url = this.currentUrl();
    return this.moreItems.some((item) => url === item.path || url.startsWith(`${item.path}/`));
  });

  toggleMore(): void {
    this.moreOpen.update((open) => !open);
  }

  closeMore(): void {
    this.moreOpen.set(false);
  }
}
