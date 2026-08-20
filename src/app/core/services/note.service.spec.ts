import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { NoteService } from './note.service';

describe('NoteService', () => {
  let service: NoteService;
  let set: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    set = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        NoteService,
        {
          provide: StorageService,
          useValue: { get: <T>(_key: string, fallback: T) => fallback, set },
        },
      ],
    });
    service = TestBed.inject(NoteService);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T09:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('saves, exposes, and persists a note', () => {
    service.saveNote('signals', 'angular', 'Remember computed signals');

    expect(service.hasNote('signals')).toBe(true);
    expect(service.noteCount()).toBe(1);
    expect(service.getNote('signals')).toEqual({
      topicId: 'signals',
      subjectId: 'angular',
      content: 'Remember computed signals',
      updatedAt: '2026-08-19T09:00:00.000Z',
    });
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.notes, service.notes());
  });

  it('appends to existing content with a markdown divider', () => {
    service.saveNote('signals', 'angular', 'First point  ');
    service.appendToNote('signals', 'angular', 'Second point');
    expect(service.getNote('signals')?.content).toBe('First point\n\n---\n\nSecond point');
  });

  it('deletes a note when saving whitespace-only content', () => {
    service.saveNote('signals', 'angular', 'Existing');
    service.saveNote('signals', 'angular', '   ');
    expect(service.hasNote('signals')).toBe(false);
    expect(service.noteCount()).toBe(0);
  });

  it('resets all notes and persists the empty collection', () => {
    service.saveNote('signals', 'angular', 'Existing');
    service.resetAll();
    expect(service.notes()).toEqual({});
    expect(set).toHaveBeenLastCalledWith(STORAGE_KEYS.notes, {});
  });
});
