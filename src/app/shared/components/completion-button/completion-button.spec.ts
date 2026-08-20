import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompletionButtonComponent } from './completion-button';

describe('CompletionButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompletionButtonComponent],
    }).compileComponents();
  });

  it('changes its label based on completion status', () => {
    const fixture = TestBed.createComponent(CompletionButtonComponent);
    fixture.componentRef.setInput('status', 'in-progress');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mark Complete');

    fixture.componentRef.setInput('status', 'completed');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Completed');
  });

  it('emits when clicked', () => {
    const fixture = TestBed.createComponent(CompletionButtonComponent);
    fixture.componentRef.setInput('status', 'not-started');
    const toggled = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggled);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(toggled).toHaveBeenCalledOnce();
  });
});
