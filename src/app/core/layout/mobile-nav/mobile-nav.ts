import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/dashboard', icon: '🏠' },
  { label: 'Subjects', path: '/subjects', icon: '📚' },
  { label: 'Practice', path: '/practice', icon: '🎯' },
  { label: 'AI Mentor', path: '/ai-mentor', icon: '🤖' },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
];

@Component({
  selector: 'app-mobile-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.scss',
})
export class MobileNavComponent {
  readonly navItems = NAV_ITEMS;
}
