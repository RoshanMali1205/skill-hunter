import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectComponent } from '../select/select';
import { FilterPanelComponent } from './filter-panel';

describe('FilterPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FilterPanelComponent] }).compileComponents();
  });

  it('renders the current filter values', async () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    fixture.componentRef.setInput('filter', {
      searchTerm: 'signals',
      difficulty: 'advanced',
      priority: 'high',
      status: 'in-progress',
      bookmarked: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement).value,
    ).toBe('signals');
    expect(
      (fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement).checked,
    ).toBe(true);
    const selects = fixture.debugElement.queryAll(By.directive(SelectComponent));
    expect(selects.map((item) => item.componentInstance.value())).toEqual([
      'advanced',
      'high',
      'in-progress',
    ]);
  });

  it('emits an immutable merged filter update', () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    const original = { difficulty: 'beginner' as const, bookmarked: false };
    fixture.componentRef.setInput('filter', original);
    const changed = vi.fn();
    fixture.componentInstance.filterChange.subscribe(changed);
    fixture.detectChanges();

    fixture.componentInstance.update({ bookmarked: true });
    expect(changed).toHaveBeenCalledWith({ difficulty: 'beginner', bookmarked: true });
    expect(original).toEqual({ difficulty: 'beginner', bookmarked: false });
  });

  it('wires search and select controls to filter changes', () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    fixture.componentRef.setInput('filter', {});
    const changed = vi.fn();
    fixture.componentInstance.filterChange.subscribe(changed);
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'rxjs';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const difficulty = fixture.debugElement.queryAll(By.directive(SelectComponent))[0]!
      .componentInstance as SelectComponent;
    difficulty.valueChange.emit('advanced');
    expect(changed).toHaveBeenCalledWith({ searchTerm: 'rxjs' });
    expect(changed).toHaveBeenCalledWith({ difficulty: 'advanced' });
  });
});
