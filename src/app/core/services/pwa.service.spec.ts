import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  const versionUpdates = new Subject<unknown>();
  const checkForUpdate = vi.fn().mockResolvedValue(false);
  const activateUpdate = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.useFakeTimers();
    checkForUpdate.mockClear();
    activateUpdate.mockClear();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({
      providers: [
        PwaService,
        {
          provide: SwUpdate,
          useValue: { isEnabled: true, versionUpdates, checkForUpdate, activateUpdate },
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('checks for updates at startup and detects version-ready events', async () => {
    const service = TestBed.inject(PwaService);
    await Promise.resolve();
    expect(checkForUpdate).toHaveBeenCalledOnce();
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(service.updateAvailable()).toBe(true);
  });

  it('captures and resolves the install prompt', async () => {
    const service = TestBed.inject(PwaService);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(service.canInstall()).toBe(true);
    await expect(service.promptInstall()).resolves.toBe('accepted');
    expect(preventDefault).toHaveBeenCalled();
    expect(prompt).toHaveBeenCalledOnce();
    expect(service.canInstall()).toBe(false);
    expect(service.isInstalled()).toBe(true);
  });

  it('reports unavailable installation and reacts to appinstalled', async () => {
    const service = TestBed.inject(PwaService);
    await expect(service.promptInstall()).resolves.toBe('unavailable');
    window.dispatchEvent(new Event('appinstalled'));
    expect(service.isInstalled()).toBe(true);
    expect(service.canInstall()).toBe(false);
  });
});
