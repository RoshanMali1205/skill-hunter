import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ContentService } from '../../services/content.service';
import { SearchResultComponent } from '../../../shared/components/search-result/search-result';

@Component({
  selector: 'app-search',
  imports: [SearchResultComponent],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent {
  private readonly contentService = inject(ContentService);
  private readonly termChanges = new Subject<string>();

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
}
