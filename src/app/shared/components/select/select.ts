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

@Component({
  selector: 'app-select',
  imports: [IconComponent],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  host: {
    '[class.select--open]': 'open()',
    '[class.select--disabled]': 'disabled()',
  },
})
export class SelectComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

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
    this.open.update((isOpen) => !isOpen);
  }

  select(option: SelectOption): void {
    if (option.disabled) return;
    this.valueChange.emit(option.value);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
