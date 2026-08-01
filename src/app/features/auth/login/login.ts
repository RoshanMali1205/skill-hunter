import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);

  readonly isLoading = this.authService.isLoading;
  readonly error = this.authService.error;

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  async submit(): Promise<void> {
    const success = await this.authService.login({ email: this.email(), password: this.password() });
    if (success) {
      // Full reload (not router.navigate) so every root-scoped store
      // (progress, bookmarks, activity, ...) re-reads from this user's
      // namespaced storage keys instead of holding a previous session's data.
      const redirect = this.safeRedirectPath(
        this.route.snapshot.queryParamMap.get('redirect'),
      );
      window.location.replace(redirect);
    }
  }

  /**
   * Only allow same-origin relative paths into the authenticated app.
   * Rejects absolute URLs, protocol-relative hosts, and auth routes
   * (which would loop a signed-in user back onto the login screen).
   */
  private safeRedirectPath(raw: string | null): string {
    if (!raw) return '/dashboard';
    const path = raw.trim();
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      return '/dashboard';
    }
    try {
      const url = new URL(path, window.location.origin);
      if (url.origin !== window.location.origin) return '/dashboard';
      const pathname = url.pathname.replace(/\/+$/, '') || '/';
      if (pathname === '/login' || pathname === '/register') {
        return '/dashboard';
      }
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return '/dashboard';
    }
  }
}
