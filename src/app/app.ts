import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaService } from './core/services/pwa.service';
import { PwaUpdateBannerComponent } from './shared/components/pwa-update-banner/pwa-update-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaUpdateBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Construct early so `beforeinstallprompt` / update events are not missed.
  private readonly pwa = inject(PwaService);
}
