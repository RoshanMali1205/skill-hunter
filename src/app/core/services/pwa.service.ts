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

    // Catch updates published while the tab stays open.
    const hourMs = 60 * 60 * 1000;
    window.setInterval(() => {
      void this.swUpdate?.checkForUpdate().catch(() => undefined);
    }, hourMs);
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
