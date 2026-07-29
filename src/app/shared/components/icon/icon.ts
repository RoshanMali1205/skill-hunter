import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICON_PATHS } from './icon-paths';

@Component({
  selector: 'app-icon',
  template: `<svg
    viewBox="0 0 24 24"
    [class.icon--filled]="filled()"
    [innerHTML]="markup()"
    aria-hidden="true"
  ></svg>`,
  styleUrl: './icon.scss',
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  name = input.required<string>();
  filled = input(false);

  readonly markup = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICON_PATHS[this.name()] ?? ''),
  );
}
