import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadAloudButtonComponent } from './read-aloud-button';

describe('ReadAloudButtonComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ReadAloudButtonComponent] }));

  it.each([
    [false, 'Listen to this topic'],
    [true, 'Stop listening'],
  ])('renders speaking=%s state', (speaking, label) => {
    const fixture = TestBed.createComponent(ReadAloudButtonComponent);
    fixture.componentRef.setInput('speaking', speaking);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe(label);
    expect(button.getAttribute('aria-pressed')).toBe(String(speaking));
  });

  it('honors disabled state and emits enabled clicks', () => {
    const fixture = TestBed.createComponent(ReadAloudButtonComponent);
    fixture.componentRef.setInput('speaking', false);
    fixture.componentRef.setInput('disabled', false);
    const toggled = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggled);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(toggled).toHaveBeenCalledOnce();
  });
});
