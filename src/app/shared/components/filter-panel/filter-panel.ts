import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopicFilter } from '../../../core/models/filters.models';
import { SelectComponent } from '../select/select';
import { SelectOption } from '../select/select.models';

@Component({
  selector: 'app-filter-panel',
  imports: [FormsModule, SelectComponent],
  templateUrl: './filter-panel.html',
  styleUrl: './filter-panel.scss',
})
export class FilterPanelComponent {
  filter = input.required<TopicFilter>();
  filterChange = output<TopicFilter>();

  readonly difficultyOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  readonly priorityOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    { value: 'must-know', label: 'Must Know' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  readonly statusOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    { value: 'not-started', label: 'Not Started' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  update(partial: Partial<TopicFilter>): void {
    this.filterChange.emit({ ...this.filter(), ...partial });
  }
}
