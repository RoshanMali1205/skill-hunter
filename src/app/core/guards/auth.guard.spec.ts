import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  const isAuthenticated = signal(false);
  const createUrlTree = vi.fn((commands, extras) => ({ commands, extras }));

  beforeEach(() => {
    isAuthenticated.set(false);
    createUrlTree.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
  });

  it('allows authenticated users into protected routes', () => {
    isAuthenticated.set(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirects guests to login and preserves the requested URL', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/topics/signals' } as never),
    );
    expect(result).toEqual({
      commands: ['/login'],
      extras: { queryParams: { redirect: '/topics/signals' } },
    });
  });

  it('allows guests and redirects authenticated users away from auth pages', () => {
    expect(TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never))).toBe(true);
    isAuthenticated.set(true);
    expect(TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never))).toEqual({
      commands: ['/dashboard'],
      extras: undefined,
    });
  });
});
