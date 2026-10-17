import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { MetricsService } from '../../core/services/metrics.service';
import { SubjectListComponent } from './subject-list';

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: 'Modern Angular',
  order: 1,
  categories: [],
};

describe('SubjectListComponent', () => {
  const computeSubjectMetrics = vi.fn((item: Subject) => ({
    subject: item,
    completed: 1,
    total: 2,
    percentage: 50,
    categories: [],
  }));

  beforeEach(() => {
    computeSubjectMetrics.mockClear();
    TestBed.configureTestingModule({
      imports: [SubjectListComponent],
      providers: [
        provideRouter([]),
        { provide: ContentService, useValue: { getSubjects: () => of([subject]) } },
        { provide: MetricsService, useValue: { computeSubjectMetrics } },
      ],
    });
  });

  it('maps each subject to its progress metrics', () => {
    const fixture = TestBed.createComponent(SubjectListComponent);
    fixture.detectChanges();
    expect(computeSubjectMetrics).toHaveBeenCalledWith(subject);
    expect(fixture.componentInstance.subjectMetrics()).toEqual([
      expect.objectContaining({ completed: 1, total: 2, percentage: 50 }),
    ]);
    expect(fixture.nativeElement.textContent).toContain('Angular');
    expect(fixture.nativeElement.textContent).toContain('1 / 2 topics completed');
  });
});
