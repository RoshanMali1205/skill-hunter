import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { scopedKey } from './storage-keys';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly authService = inject(AuthService);
  private readonly isBrowser = typeof window !== 'undefined' && !!window.localStorage;

  get<T>(key: string, fallback: T): T {
    if (!this.isBrowser) {
      return fallback;
    }

    const fullKey = this.scoped(key);
    const raw = window.localStorage.getItem(fullKey);
    if (raw === null) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[StorageService] Corrupted value for key "${fullKey}", resetting to default.`);
      window.localStorage.removeItem(fullKey);
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    if (!this.isBrowser) {
      return;
    }

    window.localStorage.setItem(this.scoped(key), JSON.stringify(value));
  }

  remove(key: string): void {
    if (!this.isBrowser) {
      return;
    }

    window.localStorage.removeItem(this.scoped(key));
  }

  clear(keys: string[]): void {
    keys.forEach((key) => this.remove(key));
  }

  private scoped(key: string): string {
    return scopedKey(key, this.authService.currentUserId());
  }
}
