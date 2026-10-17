import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { BreadcrumbComponent } from './breadcrumb';

describe('BreadcrumbComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [provideRouter([])],
    });
  });

  it('links ancestors and marks the current page', () => {
    const fixture = TestBed.createComponent(BreadcrumbComponent);
    fixture.componentRef.setInput('items', [
      { label: 'Subjects', link: ['/subjects'] },
      { label: 'Angular', link: ['/subjects', 'angular'] },
      { label: 'Signals', link: ['/subjects', 'angular', 'topics', 'signals'] },
    ]);
    fixture.detectChanges();

    const links = [...fixture.nativeElement.querySelectorAll('a')].map((link) =>
      link.textContent.trim(),
    );
    expect(links).toEqual(['Subjects', 'Angular']);
    const current = fixture.nativeElement.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.textContent?.trim()).toBe('Signals');
  });
});
