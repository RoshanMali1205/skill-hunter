import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaService } from './core/services/pwa.service';
import { IndependenceDayIconComponent } from './shared/components/independence-day-icon/independence-day-icon';
import { PwaUpdateBannerComponent } from './shared/components/pwa-update-banner/pwa-update-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IndependenceDayIconComponent, PwaUpdateBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Construct early so `beforeinstallprompt` / update events are not missed.
  private readonly pwa = inject(PwaService);
}
