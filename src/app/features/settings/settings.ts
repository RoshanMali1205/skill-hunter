import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { DataManagementService } from '../../core/services/data-management.service';
import { ProfileService } from '../../core/services/profile.service';
import { PwaService } from '../../core/services/pwa.service';
import { AppSettings, ColorTheme } from '../../core/models';
import { SelectComponent } from '../../shared/components/select/select';
import { SelectOption } from '../../shared/components/select/select.models';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink, SelectComponent, IconComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly dataManagementService = inject(DataManagementService);
  private readonly profileService = inject(ProfileService);
  readonly pwa = inject(PwaService);

  readonly settings = this.settingsService.settings;
  readonly displayName = this.profileService.displayName;
  readonly photoDataUrl = this.profileService.photoDataUrl;
  readonly nameDraft = signal(this.profileService.displayName());
  readonly profileMessage = signal<{ text: string; success: boolean } | null>(null);
  readonly confirmingReset = signal(false);
  readonly resetConfirmText = signal('');
  readonly canConfirmReset = computed(() => this.resetConfirmText().trim().toUpperCase() === 'RESET');
  readonly importMessage = signal<{ text: string; success: boolean } | null>(null);
  readonly installMessage = signal<string | null>(null);

  readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );

  readonly difficultyOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  readonly colorThemeOptions: {
    id: ColorTheme;
    label: string;
    description: string;
    swatches: string[];
  }[] = [
    {
      id: 'ocean',
      label: 'Ocean',
      description: 'Professional blue accents',
      swatches: ['#f6f7f9', '#e8f4fb', '#0b6e99', '#003366'],
    },
    {
      id: 'forest',
      label: 'Forest',
      description: 'Deep green accents',
      swatches: ['#f6f7f9', '#e8f5e9', '#2e7d32', '#1b5e20'],
    },
    {
      id: 'ember',
      label: 'Ember',
      description: 'Crimson accents',
      swatches: ['#f6f7f9', '#fdecec', '#c62828', '#8e0000'],
    },
    {
      id: 'sunset',
      label: 'Sunset',
      description: 'Amber orange accents',
      swatches: ['#f6f7f9', '#fff4e8', '#e65100', '#bf360c'],
    },
    {
      id: 'blush',
      label: 'Blush',
      description: 'Refined rose accents',
      swatches: ['#f6f7f9', '#fceef4', '#c2185b', '#880e4f'],
    },
    {
      id: 'pearl',
      label: 'Pearl',
      description: 'Warm taupe accents',
      swatches: ['#f6f7f9', '#f5f0eb', '#795548', '#5d4037'],
    },
    {
      id: 'midnight',
      label: 'Midnight',
      description: 'Ink slate accents',
      swatches: ['#f6f7f9', '#eef2f6', '#334155', '#0f172a'],
    },
  ];

  saveDisplayName(): void {
    const ok = this.profileService.setDisplayName(this.nameDraft());
    this.profileMessage.set({
      text: ok ? 'Name updated.' : 'Enter a name to continue.',
      success: ok,
    });
    if (ok) {
      this.nameDraft.set(this.profileService.displayName());
    }
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const result = await this.profileService.setPhotoFromFile(file);
    this.profileMessage.set({
      text: result.ok ? 'Photo updated.' : result.error,
      success: result.ok,
    });
    input.value = '';
  }

  removePhoto(): void {
    this.profileService.clearPhoto();
    this.profileMessage.set({ text: 'Photo removed.', success: true });
  }

  setTheme(theme: AppSettings['theme']): void {
    if (theme !== this.settings().theme) {
      this.settingsService.toggleTheme();
    }
  }

  setColorTheme(colorTheme: ColorTheme): void {
    this.settingsService.setColorTheme(colorTheme);
  }

  setDefaultDifficulty(value: AppSettings['defaultDifficulty']): void {
    this.settingsService.setDefaultDifficulty(value);
  }

  setShowAnswersAutomatically(value: boolean): void {
    this.settingsService.setShowAnswersAutomatically(value);
  }

  async installApp(): Promise<void> {
    const outcome = await this.pwa.promptInstall();
    if (outcome === 'accepted') {
      this.installMessage.set('Skill Hunter was added to your device.');
    } else if (outcome === 'dismissed') {
      this.installMessage.set('Install canceled.');
    } else {
      this.installMessage.set(
        'Use your browser menu → “Install app” / “Add to Home Screen” if the button is unavailable.',
      );
    }
  }

  exportProgress(): void {
    this.dataManagementService.downloadExport();
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = this.dataManagementService.importFromJson(parsed);
      this.importMessage.set({
        text: result.success ? 'Progress imported successfully.' : (result.error ?? 'Import failed.'),
        success: result.success,
      });
    } catch {
      this.importMessage.set({ text: 'This file is not valid JSON.', success: false });
    } finally {
      input.value = '';
    }
  }

  requestReset(): void {
    this.confirmingReset.set(true);
    this.resetConfirmText.set('');
  }

  cancelReset(): void {
    this.confirmingReset.set(false);
    this.resetConfirmText.set('');
  }

  confirmReset(): void {
    if (!this.canConfirmReset()) return;
    this.dataManagementService.resetAllProgress();
    this.confirmingReset.set(false);
    this.resetConfirmText.set('');
  }
}
