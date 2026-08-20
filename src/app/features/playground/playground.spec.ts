import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Topic } from '../../core/models';
import { CodeRunnerService } from '../../core/services/code-runner.service';
import { ContentService } from '../../core/services/content.service';
import { SettingsService } from '../../core/services/settings.service';
import { PlaygroundComponent } from './playground';

interface PlaygroundInternals {
  view?: {
    state: { doc: { length: number; toString(): string } };
    dispatch(change: unknown): void;
    destroy(): void;
  };
}

const topic: Topic = {
  id: 'arrays',
  categoryId: 'js-coding-practice',
  subjectId: 'javascript',
  title: 'Arrays',
  description: '',
  difficulty: 'beginner',
  interviewPriority: 'high',
  tags: [],
  blocks: [
    {
      id: 'reverse',
      type: 'code-example',
      order: 1,
      title: 'Reverse array',
      language: 'javascript',
      code: 'console.log([1,2].reverse())',
      explanation: '',
    },
  ],
};

describe('PlaygroundComponent', () => {
  const run = vi.fn();
  const dispatch = vi.fn<(change: unknown) => void>();
  const destroy = vi.fn<() => void>();
  let component: PlaygroundComponent;

  beforeEach(() => {
    run.mockReset();
    dispatch.mockReset();
    destroy.mockReset();
    TestBed.configureTestingModule({
      imports: [PlaygroundComponent],
      providers: [
        { provide: CodeRunnerService, useValue: { run } },
        { provide: ContentService, useValue: { getSubjectTopics: () => of([topic]) } },
        { provide: SettingsService, useValue: { settings: signal({ theme: 'light' }) } },
      ],
    });
    component = TestBed.createComponent(PlaygroundComponent).componentInstance;
    (component as unknown as PlaygroundInternals).view = {
      state: { doc: { length: 10, toString: () => 'console.log(1)' } },
      dispatch,
      destroy,
    };
  });

  it('extracts and groups coding-practice snippets', () => {
    expect(component.snippets()).toEqual([
      expect.objectContaining({ id: 'reverse', groupLabel: 'Arrays' }),
    ]);
    expect(component.snippetSelectGroups()[1]!.options[0]).toMatchObject({
      value: 'reverse',
      label: 'Reverse array',
    });
  });

  it('loads snippets and resets previous execution state', () => {
    component.hasRun.set(true);
    component.logs.set([{ level: 'log', text: 'old' }]);
    component.loadSnippet('reverse');
    expect(dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 10, insert: 'console.log([1,2].reverse())' },
    });
    expect(component.selectedSnippetId()).toBe('reverse');
    expect(component.hasRun()).toBe(false);
    expect(component.logs()).toEqual([]);
  });

  it('runs editor code and exposes execution results', async () => {
    run.mockResolvedValue({
      logs: [{ level: 'log', text: '1' }],
      error: null,
      ms: 2.6,
      timedOut: false,
    });
    await component.run();
    expect(run).toHaveBeenCalledWith('console.log(1)');
    expect(component.logs()).toEqual([{ level: 'log', text: '1' }]);
    expect(component.elapsedMs()).toBe(3);
    expect(component.hasRun()).toBe(true);
    expect(component.running()).toBe(false);
  });

  it('destroys the editor view', () => {
    component.ngOnDestroy();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
