import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterComponent } from './register';

describe('RegisterComponent', () => {
  const register = vi.fn();
  const isLoading = signal(false);
  const error = signal<string | null>(null);

  beforeEach(() => {
    register.mockReset();
    isLoading.set(false);
    error.set(null);
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { register, isLoading, error } },
      ],
    });
  });

  it('requires all fields and matching passwords before enabling submit', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fixture.componentInstance.name.set('Ada');
    fixture.componentInstance.email.set('ada@example.com');
    fixture.componentInstance.password.set('Password1');
    fixture.componentInstance.confirmPassword.set('Password1');
    fixture.detectChanges();
    expect(fixture.componentInstance.canSubmit()).toBe(true);
    expect(submit.disabled).toBe(false);
  });

  it('shows password strength and mismatch feedback', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.password.set('Password1');
    fixture.componentInstance.confirmPassword.set('Different1');
    fixture.detectChanges();

    expect(fixture.componentInstance.strength()).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.auth-form__strength-bar--filled')).toHaveLength(
      2,
    );
    expect(fixture.nativeElement.textContent).toContain('Fair');
    expect(fixture.nativeElement.textContent).toContain("Passwords don't match");
  });

  it('toggles the password field visibility', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const password = fixture.nativeElement.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.auth-form__toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  it('does not call AuthService when the form is invalid', async () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.name.set('Ada');
    await fixture.componentInstance.submit();
    expect(register).not.toHaveBeenCalled();
  });

  it('normalizes the email and submits valid registration details', async () => {
    register.mockResolvedValue(false);
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.name.set('Ada Lovelace');
    fixture.componentInstance.email.set('  ADA@Example.COM ');
    fixture.componentInstance.password.set('Password1');
    fixture.componentInstance.confirmPassword.set('Password1');

    await fixture.componentInstance.submit();

    expect(register).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'Password1',
    });
  });
});
