import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthLayoutComponent } from './auth-layout';

describe('AuthLayoutComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [provideRouter([])],
    });
  });

  it('renders the signed-out brand and privacy note', () => {
    const fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Skill Hunter');
    expect(fixture.nativeElement.textContent).toContain('Learn, Practice, Prepare, Grow');
    expect(fixture.nativeElement.textContent).toContain('saved only in this browser');
  });
});
