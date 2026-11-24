import { describe, expect, it } from 'vitest';
import { groupSubjectsByTrack } from './subject-tracks';

const item = (id: string) => ({ subject: { id } });

describe('groupSubjectsByTrack', () => {
  it('places known subjects on their tracks in catalog order', () => {
    const groups = groupSubjectsByTrack([
      item('vue'),
      item('angular'),
      item('typescript'),
      item('javascript'),
      item('ui'),
    ]);

    expect(groups.map((group) => group.title)).toEqual(['Languages', 'Frameworks', 'Engineering']);
    expect(groups[0]?.items.map((entry) => entry.subject.id)).toEqual(['javascript', 'typescript']);
    expect(groups[1]?.items.map((entry) => entry.subject.id)).toEqual(['angular', 'vue']);
    expect(groups[2]?.items.map((entry) => entry.subject.id)).toEqual(['ui']);
  });

  it('keeps subjects that are not on a track, without dropping them', () => {
    const groups = groupSubjectsByTrack([item('angular'), item('rust')]);

    expect(groups.map((group) => group.id)).toEqual(['frameworks', 'more']);
    expect(groups[1]?.items.map((entry) => entry.subject.id)).toEqual(['rust']);
  });

  it('omits a track that has no matching subjects', () => {
    const groups = groupSubjectsByTrack([item('nodejs')]);

    expect(groups).toEqual([
      expect.objectContaining({
        id: 'platform',
        items: [item('nodejs')],
      }),
    ]);
  });
});
