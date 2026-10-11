import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ContentService } from '../../services/content.service';
import { SearchResultComponent } from '../../../shared/components/search-result/search-result';
import { IconComponent } from '../../../shared/components/icon/icon';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly termChanges = new Subject<string>();
  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly variant = input<'default' | 'header'>('default');
  readonly closed = output<void>();
  readonly term = signal('');
  readonly isOpen = signal(false);
  /** Separates "still looking" from "found nothing" so we never show a premature no-results message. */
  readonly status = signal<SearchStatus>('idle');

  readonly results = toSignal(
    this.termChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => {
        if (term.trim().length <= 1) {
          this.status.set('idle');
          return of([]);
        }
        this.status.set('loading');
        return this.contentService.search(term).pipe(
          tap(() => this.status.set('ready')),
          catchError(() => {
            this.status.set('error');
            return of([]);
          }),
        );
      }),
    ),
    { initialValue: [] },
  );

  readonly showPanel = computed(() => this.isOpen() && this.term().trim().length > 1);

  /** Plain-language status, also announced to screen readers. */
  readonly statusText = computed(() => {
    switch (this.status()) {
      case 'loading':
        return 'Searching…';
      case 'error':
        return 'Search is unavailable right now. Please try again.';
      case 'ready':
        return this.results().length === 0
          ? `No results for "${this.term().trim()}". Try a shorter or different word.`
          : `${this.results().length} result${this.results().length === 1 ? '' : 's'}`;
      default:
        return '';
    }
  });

  onInput(value: string): void {
    this.term.set(value);
    this.isOpen.set(true);
    // Hide old results at once so they are never shown as the answer to the new term.
    this.status.set(value.trim().length > 1 ? 'loading' : 'idle');
    this.termChanges.next(value);
  }

  close(): void {
    this.isOpen.set(false);
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
    this.status.set('idle');
    this.termChanges.next('');
    this.isOpen.set(false);
    this.inputEl()?.nativeElement.blur();
  }

  /** Close only when focus really leaves the search (not when it moves to a result). */
  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) return;
    this.isOpen.set(false);
  }

  /** Escape closes the panel first (keeping focus); a second Escape clears and leaves the field. */
  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.showPanel()) {
      // Focus first: the field reopens the panel on focus, so close afterwards.
      this.inputEl()?.nativeElement.focus();
      this.isOpen.set(false);
      return;
    }
    this.clearAndBlur();
    this.closed.emit();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;

    const links = this.resultLinks();
    const input = this.inputEl()?.nativeElement;
    const active = document.activeElement as HTMLElement | null;
    const index = active ? links.indexOf(active as HTMLAnchorElement) : -1;

    if (event.key === 'Enter') {
      // Enter in the field opens the best match. On a result it follows the link as usual.
      if (active === input && this.status() === 'ready' && links.length > 0) {
        event.preventDefault();
        links[0].click();
      }
      return;
    }

    if (!this.showPanel() && event.key === 'ArrowDown' && active === input) {
      this.isOpen.set(true);
      return;
    }
    if (links.length === 0) return;

    event.preventDefault();
    if (event.key === 'ArrowDown') {
      links[Math.min(index + 1, links.length - 1)].focus();
    } else if (index <= 0) {
      input?.focus();
    } else {
      links[index - 1].focus();
    }
  }

  private resultLinks(): HTMLAnchorElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLAnchorElement>('.search-result'),
    );
  }
}
