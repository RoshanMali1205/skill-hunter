import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { TopicSummary } from '../../../core/models';
import { TopicCardComponent } from './topic-card';

const topic: TopicSummary = {
  id: 'signals',
  categoryId: 'modern',
  title: 'Signals',
  description: 'Reactive values',
  difficulty: 'beginner',
  interviewPriority: 'must-know',
  tags: [],
};

describe('TopicCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TopicCardComponent],
      providers: [provideRouter([])],
    });
  });

  function create(
    status: 'not-started' | 'in-progress' | 'completed' = 'not-started',
    extras: {
      bookmarked?: boolean;
      layout?: 'grid' | 'row';
    } = {},
  ) {
    const fixture = TestBed.createComponent(TopicCardComponent);
    fixture.componentRef.setInput('topic', topic);
    fixture.componentRef.setInput('subjectId', 'typescript');
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('bookmarked', extras.bookmarked ?? false);
    fixture.componentRef.setInput('layout', extras.layout ?? 'grid');
    fixture.detectChanges();
    return fixture;
  }

  it('links to the topic and reflects status, bookmark, and layout', () => {
    const idle = create();
    const link = idle.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/subjects/typescript/topics/signals');
    expect(idle.componentInstance.visual().color).toBe('#3178c6');
    expect(idle.nativeElement.textContent).toContain('Beginner');
    expect(idle.nativeElement.textContent).toContain('Must Know');
    expect(idle.nativeElement.querySelector('.topic-card__status')).toBeNull();

    const done = create('completed', { bookmarked: true, layout: 'row' });
    expect(done.nativeElement.querySelector('.topic-card--completed')).toBeTruthy();
    expect(done.nativeElement.querySelector('.topic-card--row')).toBeTruthy();
    expect(done.nativeElement.textContent).toContain('Completed');
    expect(done.nativeElement.querySelector('[aria-label="Bookmarked"]')).toBeTruthy();

    const started = create('in-progress');
    expect(started.nativeElement.textContent).toContain('In Progress');
  });
});
