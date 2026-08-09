import { Component, inject } from '@angular/core';
import { PwaService } from '../../../core/services/pwa.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-pwa-update-banner',
  imports: [IconComponent],
  templateUrl: './pwa-update-banner.html',
  styleUrl: './pwa-update-banner.scss',
})
export class PwaUpdateBannerComponent {
  readonly pwa = inject(PwaService);

  refresh(): void {
    void this.pwa.applyUpdate();
  }
}
