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
      const redirect = this.route.snapshot.queryParamMap.get('redirect') || '/dashboard';
      window.location.href = redirect;
    }
  }
}
