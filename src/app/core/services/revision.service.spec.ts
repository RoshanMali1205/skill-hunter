import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { RevisionService } from './revision.service';

describe('RevisionService', () => {
  let service: RevisionService;
  let set: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    set = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        RevisionService,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
      ],
    });
    service = TestBed.inject(RevisionService);
  });

  it('adds each topic only once', () => {
    service.addToRevision('signals');
    service.addToRevision('signals');
    expect(service.revisionTopicIds()).toEqual(['signals']);
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('toggles membership and persists each change', () => {
    service.toggleRevision('signals');
    expect(service.isInRevision('signals')).toBe(true);
    service.toggleRevision('signals');
    expect(service.isInRevision('signals')).toBe(false);
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.revisionList, []);
  });

  it('replaces and resets the revision list', () => {
    service.replaceAll(['signals', 'rxjs']);
    expect(service.revisionTopicIds()).toEqual(['signals', 'rxjs']);
    service.resetAll();
    expect(service.revisionTopicIds()).toEqual([]);
  });
});
