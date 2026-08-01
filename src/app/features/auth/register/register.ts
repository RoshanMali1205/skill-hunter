import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getPasswordStrength } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon';

const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);

  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);

  readonly isLoading = this.authService.isLoading;
  readonly error = this.authService.error;

  readonly strength = computed(() => getPasswordStrength(this.password()));
  readonly strengthLabel = computed(() =>
    this.password() ? STRENGTH_LABELS[Math.max(0, this.strength() - 1)] : '',
  );
  readonly passwordsMismatch = computed(
    () => this.confirmPassword().length > 0 && this.password() !== this.confirmPassword(),
  );
  readonly canSubmit = computed(
    () =>
      !!this.name() &&
      !!this.email() &&
      !!this.password() &&
      this.password() === this.confirmPassword() &&
      !this.isLoading(),
  );

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    const success = await this.authService.register({
      name: this.name(),
      email: this.email(),
      password: this.password(),
    });
    if (success) {
      window.location.replace('/dashboard');
    }
  }
}
