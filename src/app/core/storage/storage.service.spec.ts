import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let userId: string | null;

  beforeEach(() => {
    window.localStorage.clear();
    userId = 'user-1';
    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: AuthService, useValue: { currentUserId: () => userId } },
      ],
    });
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores JSON under the active user scope', () => {
    service.set('progress', { completed: 2 });
    expect(window.localStorage.getItem('progress::user-1')).toBe('{"completed":2}');
    expect(service.get('progress', { completed: 0 })).toEqual({ completed: 2 });
  });

  it('uses unscoped keys when there is no active user', () => {
    userId = null;
    service.set('settings', { theme: 'dark' });
    expect(window.localStorage.getItem('settings')).toBe('{"theme":"dark"}');
  });

  it('returns the fallback and removes corrupted JSON', () => {
    window.localStorage.setItem('notes::user-1', '{broken');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(service.get('notes', {})).toEqual({});
    expect(window.localStorage.getItem('notes::user-1')).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('removes one or several scoped keys', () => {
    service.set('one', 1);
    service.set('two', 2);
    service.clear(['one', 'two']);
    expect(window.localStorage.getItem('one::user-1')).toBeNull();
    expect(window.localStorage.getItem('two::user-1')).toBeNull();
  });
});
