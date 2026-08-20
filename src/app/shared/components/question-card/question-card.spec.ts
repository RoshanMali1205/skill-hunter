import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionBlock } from '../../../core/models';
import { QuestionCardComponent } from './question-card';

const question: QuestionBlock = {
  id: 'q1',
  type: 'interview-question',
  order: 1,
  title: 'Signal fundamentals',
  question: 'What is a **signal**?',
  answer: 'Reactive state',
  explanation: 'Consumers are notified.',
  hints: ['Think about reactivity'],
};

describe('QuestionCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [QuestionCardComponent] }).compileComponents();
  });

  it('renders question metadata and inline markdown', () => {
    const fixture = TestBed.createComponent(QuestionCardComponent);
    fixture.componentRef.setInput('question', question);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Interview Question');
    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain('Signal fundamentals');
    expect(
      fixture.nativeElement.querySelector('.question-card__question strong')?.textContent,
    ).toBe('signal');
  });

  it('passes auto-reveal state through to the answer component', () => {
    const fixture = TestBed.createComponent(QuestionCardComponent);
    fixture.componentRef.setInput('question', question);
    fixture.componentRef.setInput('autoReveal', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reactive state');
    expect(fixture.nativeElement.textContent).toContain('Hide Answer');
  });

  it('emits bookmark actions and can hide the bookmark control', () => {
    const fixture = TestBed.createComponent(QuestionCardComponent);
    fixture.componentRef.setInput('question', question);
    const toggled = vi.fn();
    fixture.componentInstance.bookmarkToggled.subscribe(toggled);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.bookmark-button') as HTMLButtonElement).click();
    expect(toggled).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('showBookmark', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bookmark-button')).toBeNull();
  });

  it('emits every self-assessment result', () => {
    const fixture = TestBed.createComponent(QuestionCardComponent);
    fixture.componentRef.setInput('question', question);
    fixture.componentRef.setInput('showSelfAssessment', true);
    const assessed = vi.fn();
    fixture.componentInstance.assessed.subscribe(assessed);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.question-card__self-assess button');
    buttons.forEach((button: HTMLButtonElement) => button.click());
    expect(assessed.mock.calls.map(([result]) => result)).toEqual([
      'correct',
      'incorrect',
      'needs-revision',
    ]);
  });
});
