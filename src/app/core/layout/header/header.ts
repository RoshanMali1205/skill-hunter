import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchComponent } from '../search/search';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-header',
  imports: [RouterLink, SearchComponent, ThemeToggleComponent, IconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {}
