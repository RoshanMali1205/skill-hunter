import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchComponent } from '../search/search';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  imports: [RouterLink, SearchComponent, ThemeToggleComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {}
