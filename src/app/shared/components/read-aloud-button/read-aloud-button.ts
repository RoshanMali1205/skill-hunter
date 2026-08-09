import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-read-aloud-button',
  imports: [IconComponent, TooltipDirective],
  templateUrl: './read-aloud-button.html',
  styleUrl: './read-aloud-button.scss',
})
export class ReadAloudButtonComponent {
  speaking = input.required<boolean>();
  disabled = input(false);
  toggled = output<void>();
}
