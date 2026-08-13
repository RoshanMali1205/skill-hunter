import { Component, computed, signal } from '@angular/core';
import { isIndependenceDayIconVisible } from '../../independence-day';

const DISMISS_KEY = 'skill-hunter.independence-day-icon.dismissed-year';

function istYear(date: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    }).format(date),
  );
}

function wasDismissedThisYear(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === String(istYear());
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-independence-day-icon',
  templateUrl: './independence-day-icon.html',
  styleUrl: './independence-day-icon.scss',
})
export class IndependenceDayIconComponent {
  private readonly dismissed = signal(wasDismissedThisYear());

  readonly visible = computed(
    () => isIndependenceDayIconVisible() && !this.dismissed(),
  );

  dismiss(): void {
    try {
      localStorage.setItem(DISMISS_KEY, String(istYear()));
    } catch {
      // Ignore storage failures (private mode / quota).
    }
    this.dismissed.set(true);
  }
}
