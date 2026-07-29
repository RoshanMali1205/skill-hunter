import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-bookmark-button',
  imports: [IconComponent],
  templateUrl: './bookmark-button.html',
  styleUrl: './bookmark-button.scss',
})
export class BookmarkButtonComponent {
  bookmarked = input.required<boolean>();
  toggled = output<void>();
}
