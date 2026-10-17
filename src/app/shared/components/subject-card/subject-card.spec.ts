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
});
