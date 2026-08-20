import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteEditorComponent } from './note-editor';

describe('NoteEditorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NoteEditorComponent] }).compileComponents();
  });

  it('initializes the draft and keeps save disabled until content changes', () => {
    const fixture = TestBed.createComponent(NoteEditorComponent);
    fixture.componentRef.setInput('initialContent', 'Original note');
    fixture.detectChanges();

    const save = fixture.nativeElement.querySelector('.btn--primary') as HTMLButtonElement;
    expect(fixture.componentInstance.draft()).toBe('Original note');
    expect(save.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.btn--danger')).not.toBeNull();
  });

  it('updates the draft through the textarea and emits save', () => {
    const fixture = TestBed.createComponent(NoteEditorComponent);
    fixture.componentRef.setInput('initialContent', 'Original');
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Updated note';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.btn--primary') as HTMLButtonElement).click();

    expect(fixture.componentInstance.isDirty()).toBe(true);
    expect(saved).toHaveBeenCalledWith('Updated note');
  });

  it('renders markdown preview and returns to edit mode', () => {
    const fixture = TestBed.createComponent(NoteEditorComponent);
    fixture.componentRef.setInput('initialContent', '**Important** note');
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('.note-editor__toolbar button') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.note-editor__preview strong')?.textContent).toBe(
      'Important',
    );
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();

    (
      fixture.nativeElement.querySelector('.note-editor__toolbar button') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
  });

  it('shows an empty preview message for a blank draft', () => {
    const fixture = TestBed.createComponent(NoteEditorComponent);
    fixture.componentRef.setInput('initialContent', '');
    fixture.detectChanges();
    fixture.componentInstance.togglePreview();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nothing to preview yet.');
    expect(fixture.nativeElement.querySelector('.btn--danger')).toBeNull();
  });

  it('emits delete and close actions', () => {
    const fixture = TestBed.createComponent(NoteEditorComponent);
    fixture.componentRef.setInput('initialContent', 'Saved note');
    const deleted = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.deleted.subscribe(deleted);
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.cluster button') as NodeListOf<HTMLButtonElement>,
    );
    buttons.find((button) => button.textContent?.includes('Delete'))?.click();
    buttons.find((button) => button.textContent?.includes('Close'))?.click();
    expect(deleted).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
  });
});
