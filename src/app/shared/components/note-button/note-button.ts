import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-note-button',
  imports: [IconComponent],
  templateUrl: './note-button.html',
  styleUrl: './note-button.scss',
})
export class NoteButtonComponent {
  hasNote = input.required<boolean>();
  clicked = output<void>();
}
