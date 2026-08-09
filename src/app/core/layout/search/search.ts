import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ContentService } from '../../services/content.service';
import { SearchResultComponent } from '../../../shared/components/search-result/search-result';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-search',
  imports: [SearchResultComponent, IconComponent],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  host: {
    '[class.search-host--header]': 'variant() === "header"',
  },
})
export class SearchComponent {
  private readonly contentService = inject(ContentService);
  private readonly termChanges = new Subject<string>();
  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly variant = input<'default' | 'header'>('default');
  readonly closed = output<void>();
  readonly term = signal('');
  readonly isOpen = signal(false);

  readonly results = toSignal(
    this.termChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => (term.trim().length > 1 ? this.contentService.search(term) : of([]))),
    ),
    { initialValue: [] },
  );

  onInput(value: string): void {
    this.term.set(value);
    this.isOpen.set(true);
    this.termChanges.next(value);
  }

  close(): void {
    setTimeout(() => this.isOpen.set(false), 150);
  }

  onResultSelected(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  focusSearch(): void {
    const input = this.inputEl()?.nativeElement;
    if (!input) return;
    input.focus();
    this.isOpen.set(true);
  }

  clearAndBlur(): void {
    this.term.set('');
    this.termChanges.next('');
    this.isOpen.set(false);
    this.inputEl()?.nativeElement.blur();
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.clearAndBlur();
    this.closed.emit();
  }
}
