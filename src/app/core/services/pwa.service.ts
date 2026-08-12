import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Chromium `beforeinstallprompt` event (not in all TS libs). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private checkingUpdate = false;

  /** True when a new service-worker version is waiting to activate. */
  readonly updateAvailable = signal(false);
  /** True when the browser fired `beforeinstallprompt` (installable). */
  readonly canInstall = signal(false);
  /** True when running as an installed standalone/PWA window. */
  readonly isInstalled = signal(this.detectInstalled());

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
    });

    if (!this.swUpdate?.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateAvailable.set(true));

    // Check as soon as the app boots (do not wait for the hourly timer).
    void this.checkForUpdateSoon();

    // When the installed PWA comes back to the foreground after a Netlify deploy,
    // pick up the new build without waiting for the interval.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.checkForUpdateSoon();
      }
    });
    window.addEventListener('focus', () => {
      void this.checkForUpdateSoon();
    });
    window.addEventListener('online', () => {
      void this.checkForUpdateSoon();
    });

    // Fallback while a tab stays open for a long time.
    const fiveMinMs = 5 * 60 * 1000;
    window.setInterval(() => {
      void this.checkForUpdateSoon();
    }, fiveMinMs);
  }

  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) return 'unavailable';
    await this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
    if (outcome === 'accepted') {
      this.isInstalled.set(true);
    }
    return outcome;
  }

  async applyUpdate(): Promise<void> {
    if (!this.swUpdate?.isEnabled) {
      window.location.reload();
      return;
    }
    try {
      await this.swUpdate.activateUpdate();
    } finally {
      window.location.reload();
    }
  }

  /** Ask the service worker if Netlify has published a newer build. */
  private async checkForUpdateSoon(): Promise<void> {
    if (!this.swUpdate?.isEnabled || this.checkingUpdate) return;
    this.checkingUpdate = true;
    try {
      await this.swUpdate.checkForUpdate();
    } catch {
      // Offline or SW not ready yet — ignore.
    } finally {
      this.checkingUpdate = false;
    }
  }

  private detectInstalled(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    const media = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone =
      'standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return media || iosStandalone;
  }
}
