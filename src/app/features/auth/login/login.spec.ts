import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  const login = vi.fn();
  const isLoading = signal(false);
  const error = signal<string | null>(null);

  beforeEach(() => {
    login.mockReset();
    isLoading.set(false);
    error.set(null);
  });

  function createComponent(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login, isLoading, error } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
        },
      ],
    });
    return TestBed.createComponent(LoginComponent);
  }

  it('prefills registration details from query parameters', async () => {
    const fixture = createComponent({ email: 'learner@example.com', registered: '1' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.email()).toBe('learner@example.com');
    expect(fixture.nativeElement.textContent).toContain('Account created');
    expect(
      (fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement).value,
    ).toBe('learner@example.com');
  });

  it('disables submit until both credentials are present and reflects loading state', () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fixture.componentInstance.email.set('learner@example.com');
    fixture.componentInstance.password.set('Password1');
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);

    isLoading.set(true);
    fixture.detectChanges();
    expect(submit.disabled).toBe(true);
    expect(submit.textContent).toContain('Signing in');
  });

  it('toggles password visibility and its accessible label', () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const password = fixture.nativeElement.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.auth-form__toggle') as HTMLButtonElement;
    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  it('submits the current credentials to AuthService', async () => {
    login.mockResolvedValue(false);
    const fixture = createComponent();
    fixture.componentInstance.email.set('learner@example.com');
    fixture.componentInstance.password.set('Password1');

    await fixture.componentInstance.submit();

    expect(login).toHaveBeenCalledWith({ email: 'learner@example.com', password: 'Password1' });
  });

  it('allows only safe same-origin post-login redirects', () => {
    const component = createComponent().componentInstance;
    const safeRedirectPath = (
      component as unknown as { safeRedirectPath(raw: string | null): string }
    ).safeRedirectPath.bind(component);

    expect(safeRedirectPath('/topics/signals?tab=notes#editor')).toBe(
      '/topics/signals?tab=notes#editor',
    );
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath('//evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('https://evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('/login')).toBe('/dashboard');
    expect(safeRedirectPath('/register/')).toBe('/dashboard');
    expect(safeRedirectPath('/topics\\evil')).toBe('/dashboard');
  });
});
