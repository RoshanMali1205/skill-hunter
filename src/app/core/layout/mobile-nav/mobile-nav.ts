import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/dashboard', icon: 'home' },
  { label: 'Subjects', path: '/subjects', icon: 'book-open' },
  { label: 'Practice', path: '/practice', icon: 'target' },
  { label: 'AI Mentor', path: '/ai-mentor', icon: 'bot' },
];

const MORE_ITEMS: NavItem[] = [
  { label: 'Playground', path: '/playground', icon: 'code' },
  { label: 'Calendar', path: '/calendar', icon: 'calendar' },
  { label: 'Bookmarks', path: '/bookmarks', icon: 'bookmark' },
  { label: 'Notes', path: '/notes', icon: 'pencil' },
  { label: 'Revision', path: '/revision', icon: 'repeat' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];

@Component({
  selector: 'app-mobile-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.scss',
})
export class MobileNavComponent {
  readonly navItems = NAV_ITEMS;
  readonly moreItems = MORE_ITEMS;
  readonly moreOpen = signal(false);

  toggleMore(): void {
    this.moreOpen.update((open) => !open);
  }

  closeMore(): void {
    this.moreOpen.set(false);
  }
}
