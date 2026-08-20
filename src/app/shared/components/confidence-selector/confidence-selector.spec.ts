import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfidenceSelectorComponent } from './confidence-selector';

describe('ConfidenceSelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfidenceSelectorComponent],
    }).compileComponents();
  });

  it('marks the current confidence as active and accessible', () => {
    const fixture = TestBed.createComponent(ConfidenceSelectorComponent);
    fixture.componentRef.setInput('confidence', 'medium');
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[1].classList).toContain('confidence-selector__option--active');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('emits the selected confidence', () => {
    const fixture = TestBed.createComponent(ConfidenceSelectorComponent);
    fixture.componentRef.setInput('confidence', 'not-rated');
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('button')[2] as HTMLButtonElement).click();
    expect(changed).toHaveBeenCalledWith('high');
  });
});
