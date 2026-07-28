import { Component, input, output } from '@angular/core';
import { TopicStatus } from '../../../core/models';

@Component({
  selector: 'app-completion-button',
  templateUrl: './completion-button.html',
  styleUrl: './completion-button.scss',
})
export class CompletionButtonComponent {
  status = input.required<TopicStatus>();
  toggled = output<void>();
}
