import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentService } from '../../services/content.service';
import { SearchComponent } from './search';

describe('SearchComponent', () => {
  const search = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    search.mockReset();
    search.mockReturnValue(of([{ topicId: 'signals' }]));
    TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [provideRouter([]), { provide: ContentService, useValue: { search } }],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('debounces meaningful search terms', () => {
    const component = TestBed.createComponent(SearchComponent).componentInstance;
    component.onInput('s');
    vi.advanceTimersByTime(250);
    expect(search).not.toHaveBeenCalled();
    component.onInput('signals');
    vi.advanceTimersByTime(250);
    expect(search).toHaveBeenCalledWith('signals');
    expect(component.results()).toEqual([{ topicId: 'signals' }]);
  });

  it('opens on input and closes only when focus leaves the search', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.onInput('signals');
    expect(component.isOpen()).toBe(true);

    const inside = document.createElement('a');
    fixture.nativeElement.appendChild(inside);
    component.onFocusOut({ relatedTarget: inside } as unknown as FocusEvent);
    expect(component.isOpen()).toBe(true);

    component.onFocusOut({ relatedTarget: document.body } as unknown as FocusEvent);
    expect(component.isOpen()).toBe(false);
  });

  it('shows searching, never a premature no-results message', () => {
    search.mockReturnValue(of([]));
    const component = TestBed.createComponent(SearchComponent).componentInstance;
    component.onInput('signals');
    expect(component.status()).toBe('loading');
    expect(component.statusText()).toBe('Searching…');
    vi.advanceTimersByTime(250);
    expect(component.status()).toBe('ready');
    expect(component.statusText()).toContain('No results');
  });

  it('reports a failed search separately from no results', () => {
    search.mockReturnValue(throwError(() => new Error('offline')));
    const component = TestBed.createComponent(SearchComponent).componentInstance;
    component.onInput('signals');
    vi.advanceTimersByTime(250);
    expect(component.status()).toBe('error');
    expect(component.statusText()).toContain('unavailable');
  });

  it('moves between results with the arrow keys and back to the field', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input') as HTMLInputElement;
    const links = [0, 1].map(() => {
      const a = document.createElement('a');
      a.className = 'search-result';
      a.href = '#';
      root.appendChild(a);
      return a;
    });
    fixture.componentInstance.onInput('signals');
    vi.advanceTimersByTime(250);
    input.focus();

    const press = (key: string) =>
      root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    press('ArrowDown');
    expect(document.activeElement).toBe(links[0]);
    press('ArrowDown');
    expect(document.activeElement).toBe(links[1]);
    press('ArrowUp');
    press('ArrowUp');
    expect(document.activeElement).toBe(input);
  });

  it('emits close when a result is selected or Escape is pressed', () => {
    const component = TestBed.createComponent(SearchComponent).componentInstance;
    const closed = vi.fn();
    component.closed.subscribe(closed);
    component.onInput('signals');
    component.onResultSelected();
    expect(component.isOpen()).toBe(false);
    component.onInput('again');
    component.onEscape(); // first Escape only closes the open panel
    expect(component.isOpen()).toBe(false);
    component.onEscape(); // second one clears and leaves the field
    expect(component.term()).toBe('');
    expect(closed).toHaveBeenCalledTimes(2);
  });
});
