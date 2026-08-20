import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookmarkButtonComponent } from './bookmark-button';

describe('BookmarkButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookmarkButtonComponent],
    }).compileComponents();
  });

  it.each([
    [false, 'Save', 'Save bookmark', 'false'],
    [true, 'Saved', 'Remove bookmark', 'true'],
  ])('renders bookmarked=%s correctly', (bookmarked, text, label, pressed) => {
    const fixture = TestBed.createComponent(BookmarkButtonComponent);
    fixture.componentRef.setInput('bookmarked', bookmarked);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain(text);
    expect(button.getAttribute('aria-label')).toBe(label);
    expect(button.getAttribute('aria-pressed')).toBe(pressed);
  });

  it('emits when clicked', () => {
    const fixture = TestBed.createComponent(BookmarkButtonComponent);
    fixture.componentRef.setInput('bookmarked', false);
    const toggled = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggled);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(toggled).toHaveBeenCalledOnce();
  });
});
