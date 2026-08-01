import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-read-aloud-button',
  imports: [IconComponent],
  templateUrl: './read-aloud-button.html',
  styleUrl: './read-aloud-button.scss',
})
export class ReadAloudButtonComponent {
  speaking = input.required<boolean>();
  disabled = input(false);
  toggled = output<void>();
}
