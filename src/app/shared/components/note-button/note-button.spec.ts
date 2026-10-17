import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteButtonComponent } from './note-button';

describe('NoteButtonComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NoteButtonComponent] });
  });

  it.each([
    [false, 'Add Note', 'Add a note'],
    [true, 'Edit Note', 'Edit your note'],
  ])('renders hasNote=%s', (hasNote, text, label) => {
    const fixture = TestBed.createComponent(NoteButtonComponent);
    fixture.componentRef.setInput('hasNote', hasNote);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain(text);
    expect(button.getAttribute('aria-label')).toBe(label);
    expect(button.getAttribute('aria-pressed')).toBe(String(hasNote));
  });

  it('emits when clicked', () => {
    const fixture = TestBed.createComponent(NoteButtonComponent);
    fixture.componentRef.setInput('hasNote', false);
    const clicked = vi.fn();
    fixture.componentInstance.clicked.subscribe(clicked);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(clicked).toHaveBeenCalledOnce();
  });
});
