import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TOPIC_EXPORT_OPTIONS, Subject, Topic } from '../models';
import { ContentService } from './content.service';
import { NoteService } from './note.service';
import { ProfileService } from './profile.service';
import { TopicExportService } from './topic-export.service';

interface ExportInternals {
  printViaHiddenIframe(html: string): boolean;
}

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [
    { id: 'modern', subjectId: 'angular', title: 'Modern Angular', order: 1, topics: [] },
  ],
};
const topic: Topic = {
  id: 'signals',
  categoryId: 'modern',
  subjectId: 'angular',
  title: '<Signals>',
  description: 'Reactive state',
  difficulty: 'beginner',
  interviewPriority: 'high',
  tags: [],
  blocks: [
    { id: 'c1', type: 'concept', order: 2, title: 'Concept', content: '**Reactive** values' },
    {
      id: 'q1',
      type: 'interview-question',
      order: 1,
      question: 'What?',
      answer: 'State',
      explanation: 'Details',
    },
  ],
};

describe('TopicExportService', () => {
  const getSubjects = vi.fn();
  const getSubjectTopics = vi.fn();
  const getNote = vi.fn();
  const displayName = vi.fn();
  let service: TopicExportService;

  beforeEach(() => {
    getSubjects.mockReset();
    getSubjectTopics.mockReset();
    getNote.mockReset();
    displayName.mockReset().mockReturnValue('Roshan');
    getSubjects.mockReturnValue(of([subject]));
    getSubjectTopics.mockReturnValue(of([topic]));
    getNote.mockReturnValue({ content: 'My **note**' });
    TestBed.configureTestingModule({
      providers: [
        TopicExportService,
        { provide: ContentService, useValue: { getSubjects, getSubjectTopics } },
        { provide: NoteService, useValue: { getNote } },
        { provide: ProfileService, useValue: { displayName } },
      ],
    });
    service = TestBed.inject(TopicExportService);
  });

  it('requires at least one selected topic', async () => {
    await expect(service.exportTopics([])).resolves.toEqual({
      ok: false,
      error: 'Select at least one topic to export.',
    });
  });

  it('deduplicates topics and builds a safe printable study document', async () => {
    const print = vi
      .spyOn(service as unknown as ExportInternals, 'printViaHiddenIframe')
      .mockReturnValue(true);
    const refs = [
      { subjectId: 'angular', topicId: 'signals' },
      { subjectId: 'angular', topicId: 'signals' },
    ];
    await expect(
      service.exportTopics(refs, { ...DEFAULT_TOPIC_EXPORT_OPTIONS, includeNotes: true }),
    ).resolves.toEqual({ ok: true });
    const html = print.mock.calls[0]![0];
    expect(html).toContain('&lt;Signals&gt;');
    expect(html).toContain('<strong>Reactive</strong>');
    expect(html).toContain('My <strong>note</strong>');
    expect(html).toContain('Answer');
    expect(html).toContain('<footer class="doc-footer">Roshan</footer>');
    expect(html).toContain('@bottom-center');
    expect(html).not.toContain('position: fixed');
    expect(html).not.toContain('bottom: -16mm');
    expect(getSubjectTopics).toHaveBeenCalledOnce();
  });

  it('honors answer and note exclusions and reports print failures', async () => {
    const print = vi
      .spyOn(service as unknown as ExportInternals, 'printViaHiddenIframe')
      .mockReturnValue(false);
    const result = await service.exportTopics([{ subjectId: 'angular', topicId: 'signals' }], {
      ...DEFAULT_TOPIC_EXPORT_OPTIONS,
      includeAnswers: false,
      includeNotes: false,
    });
    expect(print.mock.calls[0]![0]).not.toContain('<div class="answer">');
    expect(getNote).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('print dialog') });
  });

  it('reports missing topics and loading errors', async () => {
    getSubjectTopics.mockReturnValue(of([]));
    await expect(
      service.exportTopics([{ subjectId: 'angular', topicId: 'missing' }]),
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('could not be loaded'),
    });
    getSubjects.mockReturnValue(throwError(() => new Error('network')));
    await expect(
      service.exportTopics([{ subjectId: 'angular', topicId: 'signals' }]),
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('Export failed'),
    });
  });

  it('uses the current profile name and escapes it in a study-pack footer', async () => {
    const print = vi
      .spyOn(service as unknown as ExportInternals, 'printViaHiddenIframe')
      .mockReturnValue(true);
    const refs = [{ subjectId: 'angular', topicId: 'signals' }];
    await service.exportTopics(refs);
    displayName.mockReturnValue('Roshan <Designer> & Team');
    getSubjectTopics.mockReturnValue(of([topic, { ...topic, id: 'signals-next' }]));
    await service.exportTopics([...refs, { subjectId: 'angular', topicId: 'signals-next' }]);
    const document = new DOMParser().parseFromString(print.mock.calls[1]![0], 'text/html');
    expect(document.querySelectorAll('.topic')).toHaveLength(2);
    expect(document.querySelector('footer')?.textContent).toBe('Roshan <Designer> & Team');
    expect(document.querySelector('footer')?.children).toHaveLength(0);
  });

  it('safely encodes the name in the print margin without allowing CSS or HTML injection', async () => {
    const name = 'Roshan "Mali" \\ </style><script>bad()</script>\n';
    displayName.mockReturnValue(name);
    const print = vi
      .spyOn(service as unknown as ExportInternals, 'printViaHiddenIframe')
      .mockReturnValue(true);
    await service.exportTopics([{ subjectId: 'angular', topicId: 'signals' }]);
    const document = new DOMParser().parseFromString(print.mock.calls[0]![0], 'text/html');
    expect(document.querySelector('script')).toBeNull();
    const css = document.querySelector('style')!.textContent!;
    const content = css.match(/@bottom-center\s*\{\s*content: "([^"]*)"/)![1]!;
    const decoded = content.replace(/\\([0-9a-f]+) /g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );
    expect(decoded).toBe(name);
    expect(css).toMatch(/@media print[\s\S]*\.doc-footer\s*\{\s*display: none/);
  });
});
