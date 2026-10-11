import { Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Topic } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { difficultyFrom, selectQuestions } from '../../shared/question-bank';
import { QuestionCardComponent } from '../../shared/components/question-card/question-card';
import { DifficultyChipComponent } from '../../shared/components/difficulty-chip/difficulty-chip';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-subject-questions',
  imports: [RouterLink, QuestionCardComponent, DifficultyChipComponent, EmptyStateComponent],
  templateUrl: './subject-questions.html',
  styleUrl: './subject-questions.scss',
})
export class SubjectQuestionsComponent {
  readonly subject = input.required<Subject>();
  readonly topics = input.required<Topic[]>();
  readonly bookmarks = inject(BookmarkService);
  readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly search = computed(() => this.params().get('q') ?? '');
  readonly category = computed(() => this.params().get('category') ?? '');
  readonly difficulty = computed(() => difficultyFrom(this.params().get('difficulty')));
  readonly questions = computed(() =>
    selectQuestions(this.topics(), {
      subjectId: this.subject().id,
      questionType: 'tricky-question',
      searchTerm: this.search(),
      categoryId: this.category() || undefined,
      difficulty: this.difficulty(),
    }),
  );
  readonly pageSize = 10;
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.questions().length / this.pageSize)),
  );
  readonly page = computed(() => {
    const value = Number(this.params().get('page') ?? 1);
    return Number.isInteger(value) ? Math.max(1, Math.min(value, this.pageCount())) : 1;
  });
  readonly visibleQuestions = computed(() =>
    this.questions().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly hasFilters = computed(
    () => !!this.search() || !!this.category() || this.difficulty() !== 'all',
  );
  readonly practiceParams = computed(() => ({
    subjectId: this.subject().id,
    questionType: 'tricky-question',
    from: 'tricky',
    categoryId: this.category() || undefined,
    difficulty: this.difficulty(),
    searchTerm: this.search() || undefined,
  }));

  updateFilters(patch: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...patch, page: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  clearFilters(): void {
    this.updateFilters({ q: null, category: null, difficulty: null });
  }

  changePage(page: number): void {
    void this.router
      .navigate([], { relativeTo: this.route, queryParams: { page }, queryParamsHandling: 'merge' })
      .then(() => this.heading()?.nativeElement.focus());
  }

  categoryTitle(topicId: string): string {
    const categoryId = this.topics().find((topic) => topic.id === topicId)?.categoryId;
    return this.subject().categories.find((category) => category.id === categoryId)?.title ?? '';
  }
}
