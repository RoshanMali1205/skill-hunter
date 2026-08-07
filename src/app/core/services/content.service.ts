import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { SearchResult, Subject, Topic } from '../models';

const SUBJECT_CONTENT_FILES: Record<string, string[]> = {
  angular: ['content/angular/topics.json', 'content/angular/topics-extended.json'],
  javascript: [
    'content/javascript/topics.json',
    'content/javascript/coding-practice.json',
    'content/javascript/topics-extended.json',
  ],
  typescript: ['content/typescript/topics.json', 'content/typescript/topics-extended.json'],
  ui: ['content/ui/topics.json', 'content/ui/topics-extended.json'],
  'system-design': ['content/system-design/topics.json'],
  'design-patterns': ['content/design-patterns/topics.json'],
};

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);

  private readonly subjects$ = this.http.get<Subject[]>('content/subjects.json').pipe(
    map((subjects) => [...subjects].sort((a, b) => a.order - b.order)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private readonly topicsBySubject = new Map<string, Observable<Topic[]>>();
  private readonly loadedTopicIndex = signal<Map<string, Topic>>(new Map());

  getSubjects(): Observable<Subject[]> {
    return this.subjects$;
  }

  getSubject(subjectId: string): Observable<Subject | undefined> {
    return this.subjects$.pipe(map((subjects) => subjects.find((s) => s.id === subjectId)));
  }

  getSubjectTopics(subjectId: string): Observable<Topic[]> {
    let cached = this.topicsBySubject.get(subjectId);
    if (!cached) {
      const files = SUBJECT_CONTENT_FILES[subjectId] ?? [];
      cached = forkJoin(files.map((file) => this.http.get<Topic[]>(file))).pipe(
        map((fileResults) => fileResults.flat()),
        tap((topics) => {
          const next = new Map(this.loadedTopicIndex());
          topics.forEach((topic) => next.set(topic.id, topic));
          this.loadedTopicIndex.set(next);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.topicsBySubject.set(subjectId, cached);
    }
    return cached;
  }

  getTopic(subjectId: string, topicId: string): Observable<Topic | undefined> {
    const existing = this.loadedTopicIndex().get(topicId);
    if (existing) {
      return of(existing);
    }
    return this.getSubjectTopics(subjectId).pipe(
      map((topics) => topics.find((t) => t.id === topicId)),
    );
  }

  search(query: string): Observable<SearchResult[]> {
    const term = query.trim().toLowerCase();
    if (!term) {
      return of([]);
    }

    return this.subjects$.pipe(
      switchMap((subjects) =>
        forkJoin(subjects.map((subject) => this.getSubjectTopics(subject.id))).pipe(
          map((topicLists) => {
            const results: SearchResult[] = [];

            subjects.forEach((subject, index) => {
              const topics = topicLists[index];
              topics.forEach((topic) => {
                const category = subject.categories.find((c) => c.id === topic.categoryId);
                const categoryTitle = category?.title ?? topic.categoryId;

                if (topic.title.toLowerCase().includes(term)) {
                  results.push({
                    subjectId: subject.id,
                    subjectTitle: subject.title,
                    categoryId: topic.categoryId,
                    categoryTitle,
                    topicId: topic.id,
                    topicTitle: topic.title,
                    matchedIn: 'title',
                    snippet: topic.title,
                  });
                  return;
                }

                if (topic.description.toLowerCase().includes(term)) {
                  results.push({
                    subjectId: subject.id,
                    subjectTitle: subject.title,
                    categoryId: topic.categoryId,
                    categoryTitle,
                    topicId: topic.id,
                    topicTitle: topic.title,
                    matchedIn: 'description',
                    snippet: topic.description,
                  });
                  return;
                }

                if (topic.tags.some((tag) => tag.toLowerCase().includes(term))) {
                  results.push({
                    subjectId: subject.id,
                    subjectTitle: subject.title,
                    categoryId: topic.categoryId,
                    categoryTitle,
                    topicId: topic.id,
                    topicTitle: topic.title,
                    matchedIn: 'tag',
                    snippet: topic.tags.join(', '),
                  });
                  return;
                }

                const questionBlock = topic.blocks.find(
                  (block) =>
                    'question' in block && block.question.toLowerCase().includes(term),
                );
                if (questionBlock && 'question' in questionBlock) {
                  results.push({
                    subjectId: subject.id,
                    subjectTitle: subject.title,
                    categoryId: topic.categoryId,
                    categoryTitle,
                    topicId: topic.id,
                    topicTitle: topic.title,
                    matchedIn: 'question',
                    snippet: questionBlock.question,
                  });
                }
              });
            });

            return results;
          }),
        ),
      ),
    );
  }
}
