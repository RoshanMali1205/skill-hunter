import { Component, inject } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-theme-toggle',
  imports: [IconComponent],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggleComponent {
  private readonly settingsService = inject(SettingsService);

  readonly settings = this.settingsService.settings;

  toggle(): void {
    this.settingsService.toggleTheme();
  }
}
