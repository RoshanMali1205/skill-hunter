import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { AuthService } from './auth.service';
import { DEFAULT_PROFILE, UserProfile } from '../models';

const MAX_PHOTO_EDGE = 256;
const JPEG_QUALITY = 0.82;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);

  private readonly _profile = signal<UserProfile>(
    this.storage.get(STORAGE_KEYS.profile, DEFAULT_PROFILE),
  );

  readonly profile = this._profile.asReadonly();

  /** Prefer profile display name; fall back to auth account name. */
  readonly displayName = computed(() => {
    const fromProfile = this._profile().displayName.trim();
    if (fromProfile) return fromProfile;
    return this.authService.user()?.name?.trim() ?? 'Hunter';
  });

  readonly photoDataUrl = computed(() => this._profile().photoDataUrl);

  readonly firstName = computed(() => {
    const name = this.displayName();
    return name.split(/\s+/).filter(Boolean)[0] ?? name;
  });

  setDisplayName(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;

    this.authService.updateDisplayName(trimmed);
    this.patch({ displayName: trimmed });
    return true;
  }

  async setPhotoFromFile(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!file.type.startsWith('image/')) {
      return { ok: false, error: 'Please choose an image file (JPG, PNG, or WebP).' };
    }
    if (file.size > MAX_SOURCE_BYTES) {
      return { ok: false, error: 'Image is too large. Please use a photo under 4 MB.' };
    }

    try {
      const dataUrl = await this.compressImage(file);
      this.patch({ photoDataUrl: dataUrl });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not process that image. Try another photo.' };
    }
  }

  clearPhoto(): void {
    this.patch({ photoDataUrl: null });
  }

  replaceAll(profile: UserProfile): void {
    this._profile.set(profile);
    this.persist();
  }

  resetAll(): void {
    this._profile.set(DEFAULT_PROFILE);
    this.persist();
  }

  private patch(partial: Partial<UserProfile>): void {
    this._profile.update((current) => ({
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    }));
    this.persist();
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.profile, this._profile());
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('load'));
      };
      image.src = objectUrl;
    });
  }
}
