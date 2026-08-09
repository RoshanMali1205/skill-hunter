import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';
import { APP_VERSION } from '../../../shared/app-version';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  hint: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'home', hint: 'Your prep overview' },
  { label: 'Subjects', path: '/subjects', icon: 'book-open', hint: 'Browse interview topics' },
  { label: 'Practice', path: '/practice', icon: 'target', hint: 'Drill interview questions' },
  { label: 'Playground', path: '/playground', icon: 'code', hint: 'Try code in the browser' },
  { label: 'AI Mentor', path: '/ai-mentor', icon: 'bot', hint: 'Ask the interview mentor' },
  { label: 'Calendar', path: '/calendar', icon: 'calendar', hint: 'Track study activity' },
  { label: 'Bookmarks', path: '/bookmarks', icon: 'bookmark', hint: 'Saved topics & questions' },
  { label: 'Notes', path: '/notes', icon: 'pencil', hint: 'Your study notes' },
  { label: 'Revision', path: '/revision', icon: 'repeat', hint: 'Topics to revisit' },
  { label: 'Achievements', path: '/achievements', icon: 'medal', hint: 'Badges you have earned' },
  { label: 'Settings', path: '/settings', icon: 'settings', hint: 'Profile and preferences' },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent, TooltipDirective],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  readonly navItems = NAV_ITEMS;
  readonly appVersion = APP_VERSION;
}
