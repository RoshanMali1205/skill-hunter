import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
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

  it('opens on input and closes after the blur delay', () => {
    const component = TestBed.createComponent(SearchComponent).componentInstance;
    component.onInput('signals');
    expect(component.isOpen()).toBe(true);
    component.close();
    vi.advanceTimersByTime(149);
    expect(component.isOpen()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(component.isOpen()).toBe(false);
  });

  it('emits close when a result is selected or Escape is pressed', () => {
    const component = TestBed.createComponent(SearchComponent).componentInstance;
    const closed = vi.fn();
    component.closed.subscribe(closed);
    component.onInput('signals');
    component.onResultSelected();
    expect(component.isOpen()).toBe(false);
    component.onInput('again');
    component.onEscape();
    expect(component.term()).toBe('');
    expect(closed).toHaveBeenCalledTimes(2);
  });
});
