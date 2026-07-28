import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isBrowser = typeof window !== 'undefined' && !!window.localStorage;

  get<T>(key: string, fallback: T): T {
    if (!this.isBrowser) {
      return fallback;
    }

    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[StorageService] Corrupted value for key "${key}", resetting to default.`);
      window.localStorage.removeItem(key);
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    if (!this.isBrowser) {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    if (!this.isBrowser) {
      return;
    }

    window.localStorage.removeItem(key);
  }

  clear(keys: string[]): void {
    keys.forEach((key) => this.remove(key));
  }
}
