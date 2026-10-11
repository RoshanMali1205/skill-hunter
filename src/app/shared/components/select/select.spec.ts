import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('keyboard', () => {
    function setup() {
      vi.useFakeTimers();
      const fixture = TestBed.createComponent(SelectComponent);
      fixture.componentRef.setInput('value', 'two');
      fixture.componentRef.setInput('options', [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
      ]);
      fixture.detectChanges();
      document.body.appendChild(fixture.nativeElement);
      const root = fixture.nativeElement as HTMLElement;
      const trigger = root.querySelector('.select__trigger') as HTMLButtonElement;
      const press = (target: Element, key: string) =>
        target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      return { fixture, root, trigger, press };
    }

    afterEach(() => vi.useRealTimers());

    it('opens with the arrow key and focuses the selected option', () => {
      const { fixture, root, trigger, press } = setup();
      trigger.focus();
      press(trigger, 'ArrowDown');
      fixture.detectChanges();
      vi.runAllTimers();
      expect(fixture.componentInstance.open()).toBe(true);
      expect(document.activeElement).toBe(root.querySelectorAll('.select__option')[1]);
    });

    it('moves with arrows, Home and End, and stops at the ends', () => {
      const { fixture, root, trigger, press } = setup();
      press(trigger, 'ArrowDown');
      fixture.detectChanges();
      vi.runAllTimers();
      const options = root.querySelectorAll('.select__option');
      press(document.activeElement as Element, 'ArrowDown');
      expect(document.activeElement).toBe(options[2]);
      press(document.activeElement as Element, 'ArrowDown');
      expect(document.activeElement).toBe(options[2]);
      press(document.activeElement as Element, 'Home');
      expect(document.activeElement).toBe(options[0]);
      press(document.activeElement as Element, 'End');
      expect(document.activeElement).toBe(options[2]);
    });

    it('returns focus to the button after choosing or pressing Escape', () => {
      const { fixture, root, trigger, press } = setup();
      press(trigger, 'ArrowDown');
      fixture.detectChanges();
      vi.runAllTimers();
      press(document.activeElement as Element, 'Escape');
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toBe(false);
      expect(document.activeElement).toBe(trigger);

      press(trigger, 'ArrowDown');
      fixture.detectChanges();
      vi.runAllTimers();
      (root.querySelectorAll('.select__option')[0] as HTMLButtonElement).click();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
