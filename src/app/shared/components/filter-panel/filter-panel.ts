import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopicFilter } from '../../../core/models/filters.models';

@Component({
  selector: 'app-filter-panel',
  imports: [FormsModule],
  templateUrl: './filter-panel.html',
  styleUrl: './filter-panel.scss',
})
export class FilterPanelComponent {
  filter = input.required<TopicFilter>();
  filterChange = output<TopicFilter>();

  update(partial: Partial<TopicFilter>): void {
    this.filterChange.emit({ ...this.filter(), ...partial });
  }
}
