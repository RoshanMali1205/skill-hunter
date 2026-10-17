import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaService } from '../../../core/services/pwa.service';
import { PwaUpdateBannerComponent } from './pwa-update-banner';

describe('PwaUpdateBannerComponent', () => {
  const updateAvailable = signal(false);
  const applyUpdate = vi.fn();

  beforeEach(() => {
    updateAvailable.set(false);
    applyUpdate.mockClear();
    TestBed.configureTestingModule({
      imports: [PwaUpdateBannerComponent],
      providers: [{ provide: PwaService, useValue: { updateAvailable, applyUpdate } }],
    });
  });

  it('stays hidden until an update is ready, then applies it', () => {
    const fixture = TestBed.createComponent(PwaUpdateBannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('new version');

    updateAvailable.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A new version of Skill Hunter is ready.');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(applyUpdate).toHaveBeenCalledOnce();
  });
});
