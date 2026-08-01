import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header';
import { SidebarComponent } from '../sidebar/sidebar';
import { MobileNavComponent } from '../mobile-nav/mobile-nav';
import { APP_VERSION } from '../../../shared/app-version';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, MobileNavComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShellComponent {
  readonly appVersion = APP_VERSION;
}
