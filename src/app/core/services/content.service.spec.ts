import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Subject, Topic } from '../models';
import { ContentService } from './content.service';

const subject: Subject = {
  id: 'system-design',
  title: 'System Design',
  description: '',
  order: 2,
  categories: [{ id: 'basics', subjectId: 'system-design', title: 'Basics', order: 1, topics: [] }],
};

const topics: Topic[] = [
  {
    id: 'caching',
    categoryId: 'basics',
    subjectId: 'system-design',
    title: 'Caching',
    description: 'Reduce latency',
    difficulty: 'beginner',
    interviewPriority: 'high',
    tags: ['performance'],
    blocks: [
      {
        id: 'q1',
        type: 'interview-question',
        order: 1,
        question: 'What is eviction?',
        answer: '',
        explanation: '',
      },
    ],
  },
  {
    id: 'queues',
    categoryId: 'basics',
    subjectId: 'system-design',
    title: 'Message Queues',
    description: 'Async processing',
    difficulty: 'intermediate',
    interviewPriority: 'high',
    tags: ['async'],
    blocks: [],
  },
];

describe('ContentService', () => {
  let service: ContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and sorts subjects by configured order', async () => {
    const promise = firstValueFrom(service.getSubjects());
    http
      .expectOne('content/subjects.json')
      .flush([subject, { ...subject, id: 'angular', title: 'Angular', order: 1 }]);
    expect((await promise).map((item) => item.id)).toEqual(['angular', 'system-design']);
  });

  it('loads, indexes, and caches subject topics', async () => {
    const subjectPromise = firstValueFrom(service.getSubjects());
    http.expectOne('content/subjects.json').flush([subject]);
    await subjectPromise;

    const first = firstValueFrom(service.getSubjectTopics('system-design'));
    http.expectOne('content/system-design/topics.json').flush(topics);
    expect(await first).toEqual(topics);

    expect(await firstValueFrom(service.getSubjectTopics('system-design'))).toEqual(topics);
    http.expectNone('content/system-design/topics.json');
    expect(await firstValueFrom(service.getTopic('system-design', 'caching'))).toEqual(topics[0]);
  });

  it('returns the requested subject and an empty search for whitespace', async () => {
    const found = firstValueFrom(service.getSubject('system-design'));
    http.expectOne('content/subjects.json').flush([subject]);
    expect(await found).toEqual(subject);
    expect(await firstValueFrom(service.search('   '))).toEqual([]);
  });

  it.each([
    ['caching', 'title'],
    ['latency', 'description'],
    ['performance', 'tag'],
    ['eviction', 'question'],
  ] as const)('finds matches in %s content', async (query, matchedIn) => {
    const resultPromise = firstValueFrom(service.search(query));
    http.expectOne('content/subjects.json').flush([subject]);
    http.expectOne('content/system-design/topics.json').flush(topics);
    const results = await resultPromise;
    expect(results[0]).toMatchObject({ topicId: 'caching', matchedIn });
  });
});
