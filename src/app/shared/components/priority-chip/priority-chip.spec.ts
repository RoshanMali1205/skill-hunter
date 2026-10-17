import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PriorityChipComponent } from './priority-chip';

describe('PriorityChipComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PriorityChipComponent] });
  });

  it.each([
    ['low', 'Low Priority', 'flag', false],
    ['medium', 'Medium Priority', 'flag', true],
    ['high', 'High Priority', 'flame', false],
    ['must-know', 'Must Know', 'flame', true],
  ] as const)('describes %s priority', (priority, label, icon, filled) => {
    const fixture = TestBed.createComponent(PriorityChipComponent);
    fixture.componentRef.setInput('priority', priority);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;
    expect(chip.textContent).toContain(label);
    expect(chip.getAttribute('data-priority')).toBe(priority);
    expect(fixture.componentInstance.config()).toEqual({ label, icon, filled });
  });
});
