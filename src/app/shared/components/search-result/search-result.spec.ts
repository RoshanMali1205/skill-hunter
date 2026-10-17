import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResult } from '../../../core/models';
import { SearchResultComponent } from './search-result';

const result: SearchResult = {
  subjectId: 'angular',
  subjectTitle: 'Angular',
  categoryId: 'modern',
  categoryTitle: 'Modern',
  topicId: 'signals',
  topicTitle: 'Signals',
  matchedIn: 'title',
  snippet: 'Reactive values',
};

describe('SearchResultComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SearchResultComponent],
      providers: [provideRouter([])],
    });
  });

  it('links to the topic and emits when chosen', async () => {
    const fixture = TestBed.createComponent(SearchResultComponent);
    fixture.componentRef.setInput('result', result);
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/subjects/angular/topics/signals');
    expect(link.textContent).toContain('Angular');
    expect(link.textContent).toContain('Signals');
    expect(link.textContent).toContain('Reactive values');
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    link.click();
    await fixture.whenStable();
    expect(selected).toHaveBeenCalledOnce();
  });
});
