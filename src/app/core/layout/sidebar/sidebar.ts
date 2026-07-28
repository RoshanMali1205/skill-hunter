import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'Subjects', path: '/subjects', icon: '📚' },
  { label: 'Practice', path: '/practice', icon: '🎯' },
  { label: 'AI Mentor', path: '/ai-mentor', icon: '🤖' },
  { label: 'Bookmarks', path: '/bookmarks', icon: '⭐' },
  { label: 'Progress', path: '/progress', icon: '📈' },
  { label: 'Revision', path: '/revision', icon: '🔁' },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  readonly navItems = NAV_ITEMS;
}
