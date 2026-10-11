import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon';
import { SelectOption, SelectOptionGroup } from './select.models';

let nextSelectId = 0;

@Component({
  selector: 'app-select',
  imports: [IconComponent],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  host: {
    '[class.select--open]': 'open()',
    '[class.select--disabled]': 'disabled()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class SelectComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Current selected value. */
  value = input<string>('');
  /** Flat options list. Ignored when `groups` is non-empty. */
  options = input<SelectOption[]>([]);
  /** Optional grouped options (e.g. playground snippets). */
  groups = input<SelectOptionGroup[]>([]);
  placeholder = input('Select…');
  disabled = input(false);
  /** Accessible name announced for the combobox. */
  ariaLabel = input<string | undefined>(undefined);

  valueChange = output<string>();

  readonly open = signal(false);
  readonly listId = `select-list-${nextSelectId++}`;

  readonly flatOptions = computed(() => {
    const grouped = this.groups();
    if (grouped.length > 0) {
      return grouped.flatMap((group) => group.options);
    }
    return this.options();
  });

  readonly selectedLabel = computed(() => {
    const match = this.flatOptions().find((option) => option.value === this.value());
    return match?.label ?? this.placeholder();
  });

  readonly hasSelection = computed(() =>
    this.flatOptions().some((option) => option.value === this.value()),
  );

  toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.open.set(false);
    } else {
      this.openMenu();
    }
  }

  select(option: SelectOption): void {
    if (option.disabled) return;
    this.valueChange.emit(option.value);
    this.close(true);
  }

  /** Opens the list and moves focus to the selected option (or the first one). */
  private openMenu(): void {
    this.open.set(true);
    setTimeout(() => {
      const options = this.optionButtons();
      const selected = options.find((el) => el.classList.contains('select__option--active'));
      (selected ?? options[0])?.focus();
    });
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) this.triggerButton()?.focus();
  }

  private triggerButton(): HTMLButtonElement | null {
    return this.host.nativeElement.querySelector('.select__trigger');
  }

  private optionButtons(): HTMLButtonElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.select__option:not(:disabled)'),
    );
  }

  /** Arrow keys open the list from the button; inside the list they move between options. */
  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const key = event.key;
    const onTrigger = event.target === this.triggerButton();

    if (onTrigger && !this.open() && (key === 'ArrowDown' || key === 'ArrowUp')) {
      event.preventDefault();
      this.openMenu();
      return;
    }
    if (!this.open() || onTrigger) return;

    const options = this.optionButtons();
    const index = options.indexOf(event.target as HTMLButtonElement);
    if (key === 'ArrowDown') {
      event.preventDefault();
      options[Math.min(index + 1, options.length - 1)]?.focus();
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      options[Math.max(index - 1, 0)]?.focus();
    } else if (key === 'Home') {
      event.preventDefault();
      options[0]?.focus();
    } else if (key === 'End') {
      event.preventDefault();
      options[options.length - 1]?.focus();
    } else if (key === 'Tab') {
      this.open.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  /** Escape pressed elsewhere on the page still closes an open list. */
  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.open()) this.close(false);
  }

  /** Escape inside the select closes the list and returns focus to the button. */
  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    this.close(true);
  }
}
