import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { IconComponent } from '../../../shared/components/icon/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, ThemeToggleComponent, IconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    // Hard redirect (not router.navigate) so every root-scoped store
    // resets and re-reads fresh on the next login, instead of holding
    // this session's data in memory. replace() also drops the protected
    // page from history so Back doesn't revive a logged-out session view.
    window.location.replace('/login');
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }
}
