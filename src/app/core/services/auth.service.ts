import { Injectable, computed, signal } from '@angular/core';
import {
  AuthState,
  AuthUser,
  DEFAULT_AUTH_STATE,
  LoginRequest,
  RegisterRequest,
  validatePassword,
} from '../models';
import { STORAGE_KEYS, scopedKey } from '../storage/storage-keys';

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  passwordHash: string;
  passwordSalt: string;
}

const SESSION_KEY = 'skill-hunter.auth-session';
const USERS_KEY = 'skill-hunter.auth-users';
const PASSWORD_ITERATIONS = 120_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = typeof window !== 'undefined' && !!window.localStorage;

  private readonly _state = signal<AuthState>(this.restoreSession());

  readonly state = this._state.asReadonly();
  readonly user = computed(() => this._state().user);
  readonly isAuthenticated = computed(() => this._state().isAuthenticated);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  currentUserId(): string | null {
    return this._state().user?.id ?? null;
  }

  async register(request: RegisterRequest): Promise<boolean> {
    this._state.update((s) => ({ ...s, isLoading: true, error: null }));
    await this.delay(300);

    const name = request.name.trim();
    const email = request.email.trim().toLowerCase();

    if (!name || !email || !request.password) {
      return this.fail('All fields are required.');
    }

    const passwordCheck = validatePassword(request.password);
    if (!passwordCheck.valid) {
      return this.fail(passwordCheck.errors[0]);
    }

    const users = this.getRegisteredUsers();
    if (users.some((u) => u.email === email)) {
      return this.fail('An account with this email already exists — try signing in instead.');
    }

    const isFirstAccountOnThisBrowser = users.length === 0;
    const { passwordHash, passwordSalt } = await this.createPasswordRecord(request.password);

    const newUser: RegisteredUser = {
      id: crypto.randomUUID(),
      name,
      email,
      createdAt: new Date().toISOString(),
      passwordHash,
      passwordSalt,
    };
    this.saveRegisteredUsers([...users, newUser]);

    if (isFirstAccountOnThisBrowser) {
      this.migrateLegacyDataTo(newUser.id);
    }

    this.completeAuth(newUser);
    return true;
  }

  async login(request: LoginRequest): Promise<boolean> {
    this._state.update((s) => ({ ...s, isLoading: true, error: null }));
    await this.delay(300);

    const email = request.email.trim().toLowerCase();
    const found = this.getRegisteredUsers().find((u) => u.email === email);

    if (!found) {
      return this.fail('No account found with this email — try registering first.');
    }

    const valid = await this.verifyPassword(request.password, found);
    if (!valid) {
      return this.fail('Incorrect password. Please try again.');
    }

    this.completeAuth(found);
    return true;
  }

  logout(): void {
    if (this.isBrowser) {
      window.localStorage.removeItem(SESSION_KEY);
    }
    this._state.set(DEFAULT_AUTH_STATE);
  }

  private completeAuth(user: RegisteredUser): void {
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
    if (this.isBrowser) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    }
    this._state.set({ user: authUser, isAuthenticated: true, isLoading: false, error: null });
  }

  private fail(message: string): false {
    this._state.update((s) => ({ ...s, isLoading: false, error: message }));
    return false;
  }

  private restoreSession(): AuthState {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_AUTH_STATE;
    }
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_AUTH_STATE;
    try {
      const user = JSON.parse(raw) as AuthUser;
      return { user, isAuthenticated: true, isLoading: false, error: null };
    } catch {
      return DEFAULT_AUTH_STATE;
    }
  }

  private getRegisteredUsers(): RegisteredUser[] {
    if (!this.isBrowser) return [];
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as RegisteredUser[];
    } catch {
      return [];
    }
  }

  private saveRegisteredUsers(users: RegisteredUser[]): void {
    if (!this.isBrowser) return;
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /**
   * The very first account created on this browser inherits whatever
   * progress/bookmarks/settings/activity already exist under the old
   * unscoped keys, so switching on auth doesn't look like data loss.
   */
  private migrateLegacyDataTo(userId: string): void {
    if (!this.isBrowser) return;
    for (const key of Object.values(STORAGE_KEYS)) {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        window.localStorage.setItem(scopedKey(key, userId), raw);
      }
    }
  }

  private async createPasswordRecord(
    password: string,
  ): Promise<{ passwordHash: string; passwordSalt: string }> {
    const passwordSalt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, passwordSalt);
    return { passwordHash, passwordSalt };
  }

  private async verifyPassword(password: string, user: RegisteredUser): Promise<boolean> {
    const computed = await this.hashPassword(password, user.passwordSalt);
    return computed === user.passwordHash;
  }

  private generateSalt(byteLength = 16): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return this.toHex(bytes);
  }

  private async hashPassword(password: string, saltHex: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: this.fromHex(saltHex) as BufferSource,
        iterations: PASSWORD_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      256,
    );
    return this.toHex(new Uint8Array(bits));
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
