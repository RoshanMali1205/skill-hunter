export const STORAGE_KEYS = {
  progress: 'interview-prep.progress',
  bookmarks: 'interview-prep.bookmarks',
  practiceHistory: 'interview-prep.practice-history',
  settings: 'interview-prep.settings',
  revisionList: 'interview-prep.revision-list',
  activity: 'interview-prep.activity',
} as const;

export const CURRENT_DATA_VERSION = 1;

/**
 * Namespaces a storage key by the logged-in user's id, so each account gets
 * its own progress/bookmarks/settings/etc. on a shared browser. Auth's own
 * keys (session, registered users) are never passed through this — they
 * have to stay unscoped since they're what establishes the scope.
 */
export function scopedKey(key: string, userId: string | null): string {
  return userId ? `${key}::${userId}` : key;
}
