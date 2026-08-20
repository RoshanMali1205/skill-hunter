import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectComponent } from './select';

describe('SelectComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SelectComponent] }).compileComponents();
  });

  it('renders the placeholder when no option is selected', () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentRef.setInput('placeholder', 'Choose one');
    fixture.componentRef.setInput('options', [{ value: 'one', label: 'One' }]);
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.select__value') as HTMLElement;
    expect(value.textContent?.trim()).toBe('Choose one');
    expect(value.classList).toContain('select__value--placeholder');
  });

  it('renders the selected label and accessible state', () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentRef.setInput('value', 'two');
    fixture.componentRef.setInput('ariaLabel', 'Number');
    fixture.componentRef.setInput('options', [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two' },
    ]);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.select__trigger') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Two');
    expect(trigger.getAttribute('aria-label')).toBe('Number');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the menu and emits the chosen value', () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentRef.setInput('options', [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two' },
    ]);
    const changed = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.select__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('.select__option');
    expect(options).toHaveLength(2);
    (options[1] as HTMLButtonElement).click();

    expect(changed).toHaveBeenCalledWith('two');
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('does not open while disabled or select a disabled option', () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.open()).toBe(false);

    const changed = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    fixture.componentInstance.select({ value: 'blocked', label: 'Blocked', disabled: true });
    expect(changed).not.toHaveBeenCalled();
  });

  it('flattens and renders grouped options', () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentRef.setInput('groups', [
      { label: 'Basics', options: [{ value: 'one', label: 'One' }] },
      { label: 'Advanced', options: [{ value: 'two', label: 'Two' }] },
    ]);
    fixture.detectChanges();
    fixture.componentInstance.toggle();
    fixture.detectChanges();

    expect(fixture.componentInstance.flatOptions().map((option) => option.value)).toEqual([
      'one',
      'two',
    ]);
    expect(fixture.nativeElement.querySelectorAll('.select__group-label')).toHaveLength(2);
  });

  it('closes on Escape and outside clicks', () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.detectChanges();

    fixture.componentInstance.open.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.open()).toBe(false);

    fixture.componentInstance.open.set(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
