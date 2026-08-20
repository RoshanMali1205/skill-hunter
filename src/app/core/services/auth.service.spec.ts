import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS, scopedKey } from '../storage/storage-keys';
import { AuthService } from './auth.service';

const SESSION_KEY = 'skill-hunter.auth-session';
const USERS_KEY = 'skill-hunter.auth-users';

interface AuthInternals {
  delay(ms: number): Promise<void>;
  createPasswordRecord(password: string): Promise<{ passwordHash: string; passwordSalt: string }>;
  verifyPassword(password: string, user: unknown): Promise<boolean>;
}

describe('AuthService', () => {
  beforeEach(() => window.localStorage.clear());

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  function fastService(): AuthService {
    const service = new AuthService();
    vi.spyOn(service as unknown as AuthInternals, 'delay').mockResolvedValue();
    return service;
  }

  it('rejects missing fields and weak passwords', async () => {
    const service = fastService();
    expect(await service.register({ name: '', email: '', password: '' })).toBe(false);
    expect(service.error()).toContain('required');

    expect(
      await service.register({ name: 'Ada', email: 'ada@example.com', password: 'weak' }),
    ).toBe(false);
    expect(service.error()).toContain('at least 8');
  });

  it('registers a normalized first account and migrates legacy data', async () => {
    window.localStorage.setItem(STORAGE_KEYS.progress, '{"topic":true}');
    const service = fastService();
    vi.spyOn(service as unknown as AuthInternals, 'createPasswordRecord').mockResolvedValue({
      passwordHash: 'hash',
      passwordSalt: 'salt',
    });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');

    expect(
      await service.register({
        name: '  Ada Lovelace  ',
        email: ' ADA@Example.COM ',
        password: 'Password1',
      }),
    ).toBe(true);

    const users = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? '[]');
    expect(users[0]).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      passwordHash: 'hash',
    });
    expect(window.localStorage.getItem(scopedKey(STORAGE_KEYS.progress, users[0].id))).toBe(
      '{"topic":true}',
    );
    expect(service.isAuthenticated()).toBe(false);
  });

  it('rejects duplicate accounts and invalid login credentials', async () => {
    window.localStorage.setItem(
      USERS_KEY,
      JSON.stringify([
        {
          id: 'u1',
          name: 'Ada',
          email: 'ada@example.com',
          createdAt: '',
          passwordHash: 'h',
          passwordSalt: 's',
        },
      ]),
    );
    const service = fastService();

    expect(
      await service.register({ name: 'Ada', email: 'ADA@example.com', password: 'Password1' }),
    ).toBe(false);
    expect(service.error()).toContain('already exists');
    expect(await service.login({ email: 'missing@example.com', password: 'Password1' })).toBe(
      false,
    );
    expect(service.error()).toContain('No account found');
  });

  it('logs in, updates the display name, and logs out', async () => {
    const registered = {
      id: 'u1',
      name: 'Ada',
      email: 'ada@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      passwordHash: 'h',
      passwordSalt: 's',
    };
    window.localStorage.setItem(USERS_KEY, JSON.stringify([registered]));
    const service = fastService();
    vi.spyOn(service as unknown as AuthInternals, 'verifyPassword').mockResolvedValue(true);

    expect(await service.login({ email: ' ADA@example.com ', password: 'Password1' })).toBe(true);
    expect(service.currentUserId()).toBe('u1');
    expect(service.isAuthenticated()).toBe(true);
    expect(window.localStorage.getItem(SESSION_KEY)).toContain('ada@example.com');

    expect(service.updateDisplayName('  Augusta Ada  ')).toBe(true);
    expect(service.user()?.name).toBe('Augusta Ada');
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('restores only sessions backed by a registered account', () => {
    const user = { id: 'u1', name: 'Ada', email: 'ada@example.com', createdAt: '2026-01-01' };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    expect(new AuthService().isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();

    window.localStorage.setItem(
      USERS_KEY,
      JSON.stringify([{ ...user, passwordHash: 'h', passwordSalt: 's' }]),
    );
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    expect(new AuthService().user()).toEqual(user);
  });
});
