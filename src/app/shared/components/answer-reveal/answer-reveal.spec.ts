import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnswerRevealComponent } from './answer-reveal';

describe('AnswerRevealComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnswerRevealComponent] }).compileComponents();
  });

  it('shows hints while the answer is hidden', () => {
    const fixture = TestBed.createComponent(AnswerRevealComponent);
    fixture.componentRef.setInput('answer', 'The answer');
    fixture.componentRef.setInput('hints', ['Think about **scope**', 'Check the closure']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.answer-reveal__hints li')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Show Answer');
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(fixture.nativeElement.querySelector('.answer-reveal__content')).toBeNull();
  });

  it('reveals rendered answer and explanation when clicked', () => {
    const fixture = TestBed.createComponent(AnswerRevealComponent);
    fixture.componentRef.setInput('answer', '**Signals** are reactive.');
    fixture.componentRef.setInput('explanation', 'They notify consumers.');
    fixture.detectChanges();

    const revealButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    revealButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.revealed()).toBe(true);
    expect(fixture.nativeElement.querySelector('button')).toBe(revealButton);
    expect(revealButton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.answer-reveal__answer strong')?.textContent).toBe(
      'Signals',
    );
    expect(fixture.nativeElement.textContent).toContain('They notify consumers.');
    expect(fixture.nativeElement.textContent).toContain('Hide Answer');
  });

  it('supports auto reveal and a manual hide override', () => {
    const fixture = TestBed.createComponent(AnswerRevealComponent);
    fixture.componentRef.setInput('answer', 'Visible');
    fixture.componentRef.setInput('autoReveal', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.revealed()).toBe(true);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.revealed()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Show Answer');
  });

  it('hides the answer again when the question changes', () => {
    const fixture = TestBed.createComponent(AnswerRevealComponent);
    fixture.componentRef.setInput('questionId', 'a');
    fixture.componentRef.setInput('answer', 'Same text');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.revealed()).toBe(true);

    fixture.componentRef.setInput('questionId', 'b');
    fixture.detectChanges();
    expect(fixture.componentInstance.revealed()).toBe(false);
  });

  it('keeps every question revealed when auto reveal is on', () => {
    const fixture = TestBed.createComponent(AnswerRevealComponent);
    fixture.componentRef.setInput('questionId', 'a');
    fixture.componentRef.setInput('answer', 'A');
    fixture.componentRef.setInput('autoReveal', true);
    fixture.detectChanges();

    fixture.componentRef.setInput('questionId', 'b');
    fixture.detectChanges();
    expect(fixture.componentInstance.revealed()).toBe(true);
  });
});
