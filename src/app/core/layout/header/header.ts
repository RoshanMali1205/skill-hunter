import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { IconComponent } from '../../../shared/components/icon/icon';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-header',
  imports: [RouterLink, ThemeToggleComponent, IconComponent, TooltipDirective],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  readonly user = this.authService.user;
  readonly displayName = this.profileService.displayName;
  readonly photoDataUrl = this.profileService.photoDataUrl;
  readonly menuOpen = signal(false);

  readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );

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
}
