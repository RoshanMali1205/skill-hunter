import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchResult } from '../../../core/models';

@Component({
  selector: 'app-search-result',
  imports: [RouterLink],
  templateUrl: './search-result.html',
  styleUrl: './search-result.scss',
})
export class SearchResultComponent {
  result = input.required<SearchResult>();
  selected = output<void>();
}
