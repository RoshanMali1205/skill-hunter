import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DifficultyChipComponent } from './difficulty-chip';

describe('DifficultyChipComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DifficultyChipComponent] });
  });

  it.each([
    ['beginner', 'Beginner'],
    ['intermediate', 'Intermediate'],
    ['advanced', 'Advanced'],
  ] as const)('labels %s difficulty', (difficulty, label) => {
    const fixture = TestBed.createComponent(DifficultyChipComponent);
    fixture.componentRef.setInput('difficulty', difficulty);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;
    expect(chip.textContent?.trim()).toBe(label);
    expect(chip.getAttribute('data-difficulty')).toBe(difficulty);
  });
});
