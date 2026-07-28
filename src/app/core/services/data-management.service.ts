import { Injectable, inject } from '@angular/core';
import { ProgressStore } from './progress.store';
import { BookmarkService } from './bookmark.service';
import { PracticeService } from './practice.service';
import { RevisionService } from './revision.service';
import { SettingsService } from './settings.service';
import { CURRENT_DATA_VERSION } from '../storage/storage-keys';
import { StoredApplicationData } from '../models';

@Injectable({ providedIn: 'root' })
export class DataManagementService {
  private readonly progressStore = inject(ProgressStore);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly practiceService = inject(PracticeService);
  private readonly revisionService = inject(RevisionService);
  private readonly settingsService = inject(SettingsService);

  buildExport(): StoredApplicationData {
    return {
      version: CURRENT_DATA_VERSION,
      progress: this.progressStore.progress(),
      bookmarks: this.bookmarkService.bookmarks(),
      practiceHistory: this.practiceService.history(),
      revisionTopicIds: this.revisionService.revisionTopicIds(),
      settings: this.settingsService.settings(),
    };
  }

  downloadExport(): void {
    const data = this.buildExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skill-hunter-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importFromJson(raw: unknown): { success: boolean; error?: string } {
    if (!this.isValidStoredData(raw)) {
      return { success: false, error: 'This file is not a valid Skill Hunter export.' };
    }

    this.progressStore.replaceAll(raw.progress);
    this.bookmarkService.replaceAll(raw.bookmarks);
    this.practiceService.replaceAll(raw.practiceHistory);
    this.revisionService.replaceAll(raw.revisionTopicIds);
    this.settingsService.replaceAll(raw.settings);

    return { success: true };
  }

  resetAllProgress(): void {
    this.progressStore.resetAll();
    this.bookmarkService.resetAll();
    this.practiceService.resetAll();
    this.revisionService.resetAll();
  }

  private isValidStoredData(raw: unknown): raw is StoredApplicationData {
    if (!raw || typeof raw !== 'object') return false;
    const candidate = raw as Record<string, unknown>;
    return (
      typeof candidate['version'] === 'number' &&
      typeof candidate['progress'] === 'object' &&
      Array.isArray(candidate['bookmarks']) &&
      Array.isArray(candidate['practiceHistory']) &&
      Array.isArray(candidate['revisionTopicIds']) &&
      typeof candidate['settings'] === 'object'
    );
  }
}
