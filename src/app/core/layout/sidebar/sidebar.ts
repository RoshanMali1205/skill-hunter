import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'home' },
  { label: 'Subjects', path: '/subjects', icon: 'book-open' },
  { label: 'Practice', path: '/practice', icon: 'target' },
  { label: 'Playground', path: '/playground', icon: 'code' },
  { label: 'AI Mentor', path: '/ai-mentor', icon: 'bot' },
  { label: 'Calendar', path: '/calendar', icon: 'calendar' },
  { label: 'Bookmarks', path: '/bookmarks', icon: 'bookmark' },
  { label: 'Revision', path: '/revision', icon: 'repeat' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  readonly navItems = NAV_ITEMS;
}
