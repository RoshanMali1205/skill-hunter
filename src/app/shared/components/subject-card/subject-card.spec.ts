import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Subject } from '../../../core/models';
import { SubjectCardComponent } from './subject-card';

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: 'Components, signals, and forms.',
  order: 1,
  categories: [],
};

describe('SubjectCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubjectCardComponent],
      providers: [provideRouter([])],
    });
  });

  it('links to the subject and shows its progress', () => {
    const fixture = TestBed.createComponent(SubjectCardComponent);
    fixture.componentRef.setInput('subject', subject);
    fixture.componentRef.setInput('completed', 3);
    fixture.componentRef.setInput('total', 10);
    fixture.componentRef.setInput('percentage', 30);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/subjects/angular');
    expect(fixture.componentInstance.visual()).toEqual({ emoji: '🅰️', color: '#dd0031' });
    expect(fixture.nativeElement.textContent).toContain('3 / 10 topics completed');
    expect(fixture.nativeElement.textContent).toContain('Components, signals, and forms.');
  });

  it('shows the first areas inside a subject, and how many more there are', () => {
    const fixture = TestBed.createComponent(SubjectCardComponent);
    fixture.componentRef.setInput('subject', {
      ...subject,
      categories: [
        { id: 'a', subjectId: 'angular', title: 'Fundamentals', order: 2, topics: [] },
        { id: 'b', subjectId: 'angular', title: 'Signals', order: 1, topics: [] },
        { id: 'c', subjectId: 'angular', title: 'Routing', order: 3, topics: [] },
        { id: 'd', subjectId: 'angular', title: 'Forms', order: 4, topics: [] },
      ],
    });
    fixture.componentRef.setInput('completed', 0);
    fixture.componentRef.setInput('total', 4);
    fixture.componentRef.setInput('percentage', 0);
    fixture.detectChanges();

    const chips = [...fixture.nativeElement.querySelectorAll('.subject-card__areas li')].map(
      (node: Element) => node.textContent?.trim(),
    );
    expect(chips).toEqual(['Signals', 'Fundamentals', 'Routing', '+1 more']);
    expect(fixture.nativeElement.textContent).not.toContain('Components, signals, and forms.');
  });
});
