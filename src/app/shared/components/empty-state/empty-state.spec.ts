import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmptyStateComponent } from './empty-state';

describe('EmptyStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EmptyStateComponent] });
  });

  it('shows the title and an optional message', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Nothing here');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nothing here');
    expect(fixture.nativeElement.querySelector('p')).toBeNull();

    fixture.componentRef.setInput('message', 'Try another filter.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p')?.textContent).toContain('Try another filter.');
  });
});
