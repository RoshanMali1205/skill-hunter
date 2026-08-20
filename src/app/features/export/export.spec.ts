import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from '../../core/models';
import { BookmarkService } from '../../core/services/bookmark.service';
import { ContentService } from '../../core/services/content.service';
import { RevisionService } from '../../core/services/revision.service';
import { TopicExportService } from '../../core/services/topic-export.service';
import { ExportComponent } from './export';

const subject: Subject = {
  id: 'angular',
  title: 'Angular',
  description: '',
  order: 1,
  categories: [
    {
      id: 'modern',
      subjectId: 'angular',
      title: 'Modern',
      order: 2,
      topics: [
        {
          id: 'signals',
          categoryId: 'modern',
          title: 'Signals',
          description: '',
          difficulty: 'beginner',
          interviewPriority: 'high',
          tags: [],
        },
        {
          id: 'defer',
          categoryId: 'modern',
          title: 'Defer',
          description: '',
          difficulty: 'advanced',
          interviewPriority: 'medium',
          tags: [],
        },
      ],
    },
  ],
};

describe('ExportComponent', () => {
  const exportTopics = vi.fn();

  beforeEach(() => {
    exportTopics.mockReset();
    TestBed.configureTestingModule({
      imports: [ExportComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ subjectId: 'angular', topicId: 'signals' })),
          },
        },
        { provide: ContentService, useValue: { getSubjects: () => of([subject]) } },
        { provide: BookmarkService, useValue: { bookmarkedTopicIds: () => new Set(['defer']) } },
        { provide: RevisionService, useValue: { revisionTopicIds: () => ['signals'] } },
        { provide: TopicExportService, useValue: { exportTopics } },
      ],
    });
  });

  function create() {
    const component = TestBed.createComponent(ExportComponent).componentInstance;
    TestBed.flushEffects();
    return component;
  }

  it('hydrates route selection and builds sorted topic rows', () => {
    const component = create();
    expect(component.selectedSubjectId()).toBe('angular');
    expect(component.isSelected('signals')).toBe(true);
    expect(component.topicRows().map((row) => row.topic.id)).toEqual(['defer', 'signals']);
    expect(component.groupedRows()[0]!.title).toBe('Modern');
  });

  it('toggles individual, category, and all-subject selections', () => {
    const component = create();
    component.toggleTopic('angular', 'defer', true);
    expect(component.selectedCount()).toBe(2);
    component.toggleCategory(component.topicRows(), false);
    expect(component.selectedCount()).toBe(0);
    component.selectAllInSubject();
    expect(component.categoryFullySelected(component.topicRows())).toBe(true);
    component.clearSelection();
    expect(component.selectedCount()).toBe(0);
  });

  it('selects bookmarked and revision topics in the active subject', () => {
    const component = create();
    component.selectBookmarks();
    expect([...component.selectedTopics().keys()]).toEqual(['defer']);
    component.selectRevision();
    expect([...component.selectedTopics().keys()]).toEqual(['signals']);
  });

  it('exports selected topics with the current options', async () => {
    exportTopics.mockResolvedValue({ ok: true });
    const component = create();
    component.setOption('includeNotes', true);
    await component.exportSelected();
    expect(exportTopics).toHaveBeenCalledWith(
      [{ subjectId: 'angular', topicId: 'signals' }],
      expect.objectContaining({ includeNotes: true }),
    );
    expect(component.message()?.success).toBe(true);
  });
});
