import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadAloudButtonComponent } from './read-aloud-button';

describe('ReadAloudButtonComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ReadAloudButtonComponent] }));

  it.each([
    { speaking: false, paused: false, label: 'Listen to this topic', text: 'Listen' },
    { speaking: true, paused: false, label: 'Pause narration', text: 'Pause' },
    { speaking: true, paused: true, label: 'Resume narration', text: 'Resume' },
  ])(
    'renders $text while speaking=$speaking paused=$paused',
    ({ speaking, paused, label, text }) => {
      const fixture = TestBed.createComponent(ReadAloudButtonComponent);
      fixture.componentRef.setInput('speaking', speaking);
      fixture.componentRef.setInput('paused', paused);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe(label);
      expect(button.getAttribute('aria-pressed')).toBe(String(speaking));
      expect(button.textContent).toContain(text);
    },
  );

  it('honors disabled state and emits enabled clicks', () => {
    const fixture = TestBed.createComponent(ReadAloudButtonComponent);
    fixture.componentRef.setInput('speaking', false);
    fixture.componentRef.setInput('disabled', false);
    const toggled = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggled);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(toggled).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('[aria-label="Stop narration"]')).toBeNull();
  });

  it('offers stop only while narration is active', () => {
    const fixture = TestBed.createComponent(ReadAloudButtonComponent);
    fixture.componentRef.setInput('speaking', true);
    fixture.componentRef.setInput('paused', true);
    const stopped = vi.fn();
    fixture.componentInstance.stopped.subscribe(stopped);
    fixture.detectChanges();
    const stop = fixture.nativeElement.querySelector(
      '[aria-label="Stop narration"]',
    ) as HTMLButtonElement;
    stop.click();
    expect(stopped).toHaveBeenCalledOnce();
  });
});
