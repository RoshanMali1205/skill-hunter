import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { DataManagementService } from '../../core/services/data-management.service';
import { AppSettings } from '../../core/models';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly dataManagementService = inject(DataManagementService);

  readonly settings = this.settingsService.settings;
  readonly confirmingReset = signal(false);
  readonly resetConfirmText = signal('');
  readonly canConfirmReset = computed(() => this.resetConfirmText().trim().toUpperCase() === 'RESET');
  readonly importMessage = signal<{ text: string; success: boolean } | null>(null);

  setTheme(theme: AppSettings['theme']): void {
    if (theme !== this.settings().theme) {
      this.settingsService.toggleTheme();
    }
  }

  setDefaultDifficulty(value: AppSettings['defaultDifficulty']): void {
    this.settingsService.setDefaultDifficulty(value);
  }

  setShowAnswersAutomatically(value: boolean): void {
    this.settingsService.setShowAnswersAutomatically(value);
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
