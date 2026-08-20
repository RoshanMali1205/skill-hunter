import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeBlockComponent } from './code-block';

describe('CodeBlockComponent', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    TestBed.configureTestingModule({ imports: [CodeBlockComponent] });
  });

  afterEach(() => vi.useRealTimers());

  it('renders code and language', () => {
    const fixture = TestBed.createComponent(CodeBlockComponent);
    fixture.componentRef.setInput('code', 'const value = 1;');
    fixture.componentRef.setInput('language', 'javascript');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('javascript');
    expect(fixture.nativeElement.textContent).toContain('const value = 1;');
  });

  it('copies code and clears feedback after 1.5 seconds', async () => {
    writeText.mockResolvedValue(undefined);
    const fixture = TestBed.createComponent(CodeBlockComponent);
    fixture.componentRef.setInput('code', 'console.log(1)');
    await fixture.componentInstance.copyCode();
    expect(writeText).toHaveBeenCalledWith('console.log(1)');
    expect(fixture.componentInstance.copied()).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(fixture.componentInstance.copied()).toBe(false);
  });

  it('keeps copied state false when clipboard access fails', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const fixture = TestBed.createComponent(CodeBlockComponent);
    fixture.componentRef.setInput('code', 'x');
    await fixture.componentInstance.copyCode();
    expect(fixture.componentInstance.copied()).toBe(false);
  });
});
