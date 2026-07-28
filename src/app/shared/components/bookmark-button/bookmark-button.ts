import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-bookmark-button',
  templateUrl: './bookmark-button.html',
  styleUrl: './bookmark-button.scss',
})
export class BookmarkButtonComponent {
  bookmarked = input.required<boolean>();
  toggled = output<void>();
}
