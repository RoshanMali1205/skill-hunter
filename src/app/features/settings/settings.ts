import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { buildCustomPalette, normalizeHex } from '../../core/theme/custom-theme';
import { SettingsService } from '../../core/services/settings.service';
import { DataManagementService } from '../../core/services/data-management.service';
import { ProfileService } from '../../core/services/profile.service';
import { PwaService } from '../../core/services/pwa.service';
import {
  AppSettings,
  ColorTheme,
  ImportPreview,
  StoredApplicationData,
  UiStyle,
} from '../../core/models';
import { SelectComponent } from '../../shared/components/select/select';
import { SelectOption } from '../../shared/components/select/select.models';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-settings',
  imports: [DecimalPipe, NgTemplateOutlet, FormsModule, RouterLink, SelectComponent, IconComponent],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss', './settings.pickers.scss', './settings.custom.scss'],
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
  readonly canConfirmReset = computed(
    () => this.resetConfirmText().trim().toUpperCase() === 'RESET',
  );
  readonly importMessage = signal<{ text: string; success: boolean } | null>(null);
  readonly installMessage = signal<string | null>(null);
  /** A validated backup waiting for the user to confirm replacing their data. */
  readonly pendingImport = signal<{
    data: StoredApplicationData;
    preview: ImportPreview;
    fileName: string;
  } | null>(null);

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

  readonly uiStyleOptions: { id: UiStyle; label: string; description: string }[] = [
    { id: 'classic', label: 'Classic', description: 'Clean, flat cards. Fast and simple.' },
    {
      id: 'glass',
      label: 'Glass',
      description: 'Frosted, see-through panels over a soft color glow.',
    },
    {
      id: 'neumorphic',
      label: 'Neumorphic',
      description: 'Soft, pressed-in and raised shapes. Calm and tactile.',
    },
    {
      id: 'spatial',
      label: 'Spatial',
      description: 'Floating layers with depth, like a 3D workspace.',
    },
    {
      id: 'brutalism',
      label: 'Neo-Brutalism',
      description: 'Bold flat color, thick outlines and hard shadows.',
    },
    {
      id: 'aurora',
      label: 'Aurora',
      description: 'Glowing, slowly drifting color bands behind soft glass.',
    },
    {
      id: 'clay',
      label: 'Claymorphism',
      description: 'Soft, puffy shapes that feel like colored clay.',
    },
  ];

  /** Multi-color palettes: three colors that work together, shown in every gradient and highlight. */
  readonly paletteOptions: {
    id: ColorTheme;
    label: string;
    description: string;
    colors: {
      primary: string;
      accent: string;
      deep: string;
      tint: string;
      secondary?: string;
      tertiary?: string;
    };
  }[] = [
    {
      id: 'northern',
      label: 'Northern Lights',
      description: 'Teal, violet and pink',
      colors: {
        primary: '#0f766e',
        accent: '#6d28d9',
        deep: '#be185d',
        tint: '#f0fdfa',
        secondary: '#6d28d9',
        tertiary: '#be185d',
      },
    },
    {
      id: 'glow',
      label: 'Sunset Glow',
      description: 'Orange, rose and purple',
      colors: {
        primary: '#c2410c',
        accent: '#be185d',
        deep: '#6d28d9',
        tint: '#fff7ed',
        secondary: '#be185d',
        tertiary: '#6d28d9',
      },
    },
    {
      id: 'reef',
      label: 'Ocean Reef',
      description: 'Blue, cyan and emerald',
      colors: {
        primary: '#1d4ed8',
        accent: '#0e7490',
        deep: '#047857',
        tint: '#eff6ff',
        secondary: '#0e7490',
        tertiary: '#047857',
      },
    },
    {
      id: 'tropical',
      label: 'Tropical',
      description: 'Emerald, amber and coral',
      colors: {
        primary: '#047857',
        accent: '#b45309',
        deep: '#be123c',
        tint: '#ecfdf5',
        secondary: '#b45309',
        tertiary: '#be123c',
      },
    },
    {
      id: 'royal',
      label: 'Royal',
      description: 'Indigo, magenta and gold',
      colors: {
        primary: '#3730a3',
        accent: '#a21caf',
        deep: '#a16207',
        tint: '#eef2ff',
        secondary: '#a21caf',
        tertiary: '#a16207',
      },
    },
    {
      id: 'berry',
      label: 'Berry Blast',
      description: 'Wine, plum and coral',
      colors: {
        primary: '#9d174d',
        accent: '#6b21a8',
        deep: '#c2410c',
        tint: '#fdf2f8',
        secondary: '#6b21a8',
        tertiary: '#c2410c',
      },
    },
    {
      id: 'fjord',
      label: 'Fjord',
      description: 'Deep blue, teal and lilac',
      colors: {
        primary: '#1e40af',
        accent: '#0f766e',
        deep: '#7e22ce',
        tint: '#eff6ff',
        secondary: '#0f766e',
        tertiary: '#7e22ce',
      },
    },
    {
      id: 'candy',
      label: 'Candy Pop',
      description: 'Pink, violet and sky',
      colors: {
        primary: '#be185d',
        accent: '#7c3aed',
        deep: '#0369a1',
        tint: '#fdf2f8',
        secondary: '#7c3aed',
        tertiary: '#0369a1',
      },
    },
  ];

  /** `colors` draw the preview card in each theme's own palette, whatever theme is active now. */
  readonly colorThemeOptions: {
    id: ColorTheme;
    label: string;
    description: string;
    colors: {
      primary: string;
      accent: string;
      deep: string;
      tint: string;
      secondary?: string;
      tertiary?: string;
    };
  }[] = [
    {
      id: 'ocean',
      label: 'Ocean',
      description: 'Trusted, professional blue',
      colors: { primary: '#0b6e99', accent: '#1490c4', deep: '#003366', tint: '#e8f4fb' },
    },
    {
      id: 'indigo',
      label: 'Indigo',
      description: 'Deep and focused',
      colors: { primary: '#4338ca', accent: '#6366f1', deep: '#1e1b4b', tint: '#eef2ff' },
    },
    {
      id: 'violet',
      label: 'Violet',
      description: 'Creative and confident',
      colors: { primary: '#6d28d9', accent: '#8b5cf6', deep: '#2e1065', tint: '#f5f3ff' },
    },
    {
      id: 'teal',
      label: 'Teal',
      description: 'Fresh, calm and modern',
      colors: { primary: '#0f766e', accent: '#14b8a6', deep: '#042f2e', tint: '#f0fdfa' },
    },
    {
      id: 'forest',
      label: 'Forest',
      description: 'Natural, steady green',
      colors: { primary: '#2e7d32', accent: '#66bb6a', deep: '#145a1a', tint: '#e8f5e9' },
    },
    {
      id: 'ember',
      label: 'Ember',
      description: 'Bold, energetic crimson',
      colors: { primary: '#c62828', accent: '#e53935', deep: '#7f1d1d', tint: '#fdecec' },
    },
    {
      id: 'sunset',
      label: 'Sunset',
      description: 'Warm burnt orange',
      colors: { primary: '#c2410c', accent: '#f97316', deep: '#7c2d12', tint: '#fff7ed' },
    },
    {
      id: 'blush',
      label: 'Blush',
      description: 'Refined, modern rose',
      colors: { primary: '#be185d', accent: '#ec4899', deep: '#500724', tint: '#fdf2f8' },
    },
    {
      id: 'pearl',
      label: 'Pearl',
      description: 'Warm, understated taupe',
      colors: { primary: '#795548', accent: '#a1887f', deep: '#3e2723', tint: '#f5f0eb' },
    },
    {
      id: 'midnight',
      label: 'Midnight',
      description: 'Quiet, serious slate',
      colors: { primary: '#334155', accent: '#64748b', deep: '#020617', tint: '#eef2f6' },
    },
  ];

  // ── Custom color theme ──
  /** A handful of tasteful starting points; any color can still be typed or picked. */
  readonly customSwatches = [
    '#2563eb',
    '#4f46e5',
    '#7c3aed',
    '#db2777',
    '#e11d48',
    '#ea580c',
    '#ca8a04',
    '#059669',
    '#0891b2',
    '#475569',
  ];

  readonly customPalette = computed(() =>
    buildCustomPalette(
      this.settings().customPrimary,
      this.settings().customAccent,
      this.settings().customTertiary,
    ),
  );

  /** The learner's own theme, drawn from their current choice. */
  readonly customCard = computed(() => ({
    id: 'custom' as ColorTheme,
    label: 'Custom',
    description: 'Pick your own colors',
    colors: this.customPalette().preview,
  }));

  /** Accepts a color from the picker or a typed hex code; ignores text that is not a color yet. */
  setCustomPrimary(value: string): void {
    const hex = normalizeHex(value);
    if (!hex) return;
    this.settingsService.setCustomTheme(
      hex,
      this.settings().customAccent,
      this.settings().customTertiary,
    );
  }

  setCustomAccent(value: string): void {
    const hex = normalizeHex(value);
    if (!hex) return;
    this.settingsService.setCustomTheme(
      this.settings().customPrimary,
      hex,
      this.settings().customTertiary,
    );
  }

  resetCustomAccent(): void {
    this.settingsService.setCustomTheme(
      this.settings().customPrimary,
      null,
      this.settings().customTertiary,
    );
  }

  setCustomTertiary(value: string): void {
    const hex = normalizeHex(value);
    if (!hex) return;
    this.settingsService.setCustomTheme(
      this.settings().customPrimary,
      this.settings().customAccent,
      hex,
    );
  }

  resetCustomTertiary(): void {
    this.settingsService.setCustomTheme(
      this.settings().customPrimary,
      this.settings().customAccent,
      null,
    );
  }

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

  setUiStyle(uiStyle: UiStyle): void {
    this.settingsService.setUiStyle(uiStyle);
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

  /** Step 1: read and validate the file. Nothing is written yet. */
  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importMessage.set(null);
    this.pendingImport.set(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = this.dataManagementService.previewImport(parsed);
      if (result.success) {
        this.pendingImport.set({
          data: result.data,
          preview: result.preview,
          fileName: file.name ?? 'backup file',
        });
      } else {
        this.importMessage.set({ text: result.error, success: false });
      }
    } catch {
      this.importMessage.set({ text: 'This file is not valid JSON.', success: false });
    } finally {
      input.value = '';
    }
  }

  /** Step 2: the user confirmed, so replace the stored data. */
  confirmImport(): void {
    const pending = this.pendingImport();
    if (!pending) return;
    const result = this.dataManagementService.applyImport(pending.data);
    this.pendingImport.set(null);
    this.importMessage.set({
      text: result.success ? 'Progress imported successfully.' : (result.error ?? 'Import failed.'),
      success: result.success,
    });
  }

  cancelImport(): void {
    this.pendingImport.set(null);
    this.importMessage.set({ text: 'Import canceled. Nothing was changed.', success: true });
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
