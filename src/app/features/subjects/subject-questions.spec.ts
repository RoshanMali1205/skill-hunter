import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, Topic } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { SubjectQuestionsComponent } from './subject-questions';

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [
    { id: 'modern', subjectId: 'angular', title: 'Modern', order: 1, topics: [] },
    { id: 'forms', subjectId: 'angular', title: 'Forms', order: 2, topics: [] },
  ],
};

function trickyTopic(
  id: string,
  categoryId: string,
  difficulty: Topic['difficulty'],
  count: number,
): Topic {
  return {
    id,
    subjectId: 'angular',
    categoryId,
    title: id === 'forms' ? 'Reactive Forms' : 'Signals',
    description: '',
    difficulty,
    interviewPriority: 'high',
    tags: id === 'forms' ? ['forms'] : ['reactivity'],
    blocks: Array.from({ length: count }, (_, index) => ({
      id: `${id}-${index}`,
      type: 'tricky-question' as const,
      order: count - index,
      question: index === 0 && id === 'forms' ? 'How do validators run?' : `Prompt ${id} ${index}`,
      answer: 'hidden answer',
      explanation: '',
    })),
  };
}

const topics: Topic[] = [
  trickyTopic('signals', 'modern', 'beginner', 11),
  {
    ...trickyTopic('forms', 'forms', 'advanced', 1),
    blocks: [
      ...trickyTopic('forms', 'forms', 'advanced', 1).blocks,
      {
        id: 'output',
        type: 'output-question',
        order: 0,
        question: 'What prints?',
        answer: '1',
        explanation: '',
      },
    ],
  },
];

describe('SubjectQuestionsComponent', () => {
  let params: Record<string, string>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    params = {};
    TestBed.configureTestingModule({
      imports: [SubjectQuestionsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return { queryParamMap: convertToParamMap(params) };
            },
            get queryParamMap() {
              return of(convertToParamMap(params));
            },
          },
        },
        {
          provide: BookmarkService,
          useValue: { isQuestionBookmarked: () => false, toggleQuestionBookmark: vi.fn() },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function create() {
    const fixture = TestBed.createComponent(SubjectQuestionsComponent);
    fixture.componentRef.setInput('subject', subject);
    fixture.componentRef.setInput('topics', topics);
    fixture.detectChanges();
    return fixture;
  }

  it('pages tricky questions and ignores other question types', () => {
    const component = create().componentInstance;
    expect(component.questions()).toHaveLength(12);
    expect(component.pageCount()).toBe(2);
    expect(component.visibleQuestions()).toHaveLength(10);
    expect(component.hasFilters()).toBe(false);
    expect(component.categoryTitle('signals')).toBe('Modern');
    expect(component.categoryTitle('missing')).toBe('');
  });

  it('applies search, category, and difficulty from the query string', () => {
    params = { q: 'validators', category: 'forms', difficulty: 'advanced', page: '2' };
    const component = create().componentInstance;
    expect(component.questions().map((item) => item.block.id)).toEqual(['forms-0']);
    expect(component.page()).toBe(1);
    expect(component.hasFilters()).toBe(true);
    expect(component.practiceParams()).toMatchObject({
      subjectId: 'angular',
      questionType: 'tricky-question',
      from: 'tricky',
      categoryId: 'forms',
      difficulty: 'advanced',
      searchTerm: 'validators',
    });
  });

  it('rejects unknown pages and difficulties', () => {
    params = { page: 'nope', difficulty: 'expert' };
    const component = create().componentInstance;
    expect(component.page()).toBe(1);
    expect(component.difficulty()).toBe('all');
    expect(component.hasFilters()).toBe(false);
  });

  it('clamps the requested page and shows only that slice', () => {
    params = { page: '9' };
    const component = create().componentInstance;
    expect(component.page()).toBe(2);
    expect(component.visibleQuestions()).toHaveLength(2);
  });

  it('does not match the hidden answer', () => {
    params = { q: 'hidden answer' };
    expect(create().componentInstance.questions()).toEqual([]);
  });

  it('writes filter and page changes back to the url', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.updateFilters({ q: 'signals', category: null });
    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { q: 'signals', category: null, page: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    component.clearFilters();
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { q: null, category: null, difficulty: null, page: null },
      }),
    );

    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    component.changePage(2);
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { page: 2 },
      queryParamsHandling: 'merge',
    });
    expect(focus).toHaveBeenCalled();
  });
});
