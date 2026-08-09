import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-note-button',
  imports: [IconComponent, TooltipDirective],
  templateUrl: './note-button.html',
  styleUrl: './note-button.scss',
})
export class NoteButtonComponent {
  hasNote = input.required<boolean>();
  clicked = output<void>();
}
