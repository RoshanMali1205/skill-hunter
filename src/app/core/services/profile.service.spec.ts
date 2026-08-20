import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { ProfileService } from './profile.service';

interface ProfileInternals {
  compressImage(file: File): Promise<string>;
}

describe('ProfileService', () => {
  let service: ProfileService;
  const set = vi.fn();
  const updateDisplayName = vi.fn();

  beforeEach(() => {
    set.mockReset();
    updateDisplayName.mockReset();
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
        {
          provide: AuthService,
          useValue: { user: () => ({ name: 'Ada Lovelace' }), updateDisplayName },
        },
      ],
    });
    service = TestBed.inject(ProfileService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('falls back to the account name and derives the first name', () => {
    expect(service.displayName()).toBe('Ada Lovelace');
    expect(service.firstName()).toBe('Ada');
  });

  it('trims and persists a valid display name', () => {
    expect(service.setDisplayName('  Grace Hopper  ')).toBe(true);
    expect(updateDisplayName).toHaveBeenCalledWith('Grace Hopper');
    expect(service.displayName()).toBe('Grace Hopper');
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.profile, service.profile());
    expect(service.setDisplayName('   ')).toBe(false);
  });

  it('rejects invalid photo types and oversized images', async () => {
    expect(
      await service.setPhotoFromFile(new File(['text'], 'file.txt', { type: 'text/plain' })),
    ).toMatchObject({ ok: false });
    const oversized = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    });
    expect(await service.setPhotoFromFile(oversized)).toMatchObject({
      ok: false,
      error: expect.stringContaining('4 MB'),
    });
  });

  it('stores processed photos and handles processing failures', async () => {
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    vi.spyOn(service as unknown as ProfileInternals, 'compressImage').mockResolvedValue(
      'data:image/jpeg;base64,abc',
    );
    expect(await service.setPhotoFromFile(file)).toEqual({ ok: true });
    expect(service.photoDataUrl()).toBe('data:image/jpeg;base64,abc');
    service.clearPhoto();
    expect(service.photoDataUrl()).toBeNull();

    vi.spyOn(service as unknown as ProfileInternals, 'compressImage').mockRejectedValue(
      new Error('bad'),
    );
    expect(await service.setPhotoFromFile(file)).toMatchObject({ ok: false });
  });
});
