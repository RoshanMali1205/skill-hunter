import { Component, computed, input } from '@angular/core';
import { Difficulty } from '../../../core/models';

const LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

@Component({
  selector: 'app-difficulty-chip',
  templateUrl: './difficulty-chip.html',
  styleUrl: './difficulty-chip.scss',
})
export class DifficultyChipComponent {
  difficulty = input.required<Difficulty>();

  label = computed(() => LABELS[this.difficulty()]);
}
