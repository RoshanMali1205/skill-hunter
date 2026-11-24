export interface SubjectTrack {
  id: string;
  title: string;
  blurb: string;
  subjectIds: readonly string[];
}

/** Curated catalog order. Subjects missing from this list still appear, under More. */
export const SUBJECT_TRACKS: readonly SubjectTrack[] = [
  {
    id: 'languages',
    title: 'Languages',
    blurb: 'The syntax and type system interviews start from.',
    subjectIds: ['javascript', 'typescript'],
  },
  {
    id: 'frameworks',
    title: 'Frameworks',
    blurb: 'How a modern interface is built and structured.',
    subjectIds: ['angular', 'react', 'vue'],
  },
  {
    id: 'platform',
    title: 'Platform',
    blurb: 'Services and the runtime behind the browser.',
    subjectIds: ['nodejs'],
  },
  {
    id: 'engineering',
    title: 'Engineering',
    blurb: 'Design, accessibility, and system thinking that transfer across stacks.',
    subjectIds: ['ui', 'system-design', 'design-patterns', 'ai-concepts'],
  },
];

export interface SubjectTrackGroup<T> {
  id: string;
  title: string;
  blurb: string;
  items: T[];
}

export function groupSubjectsByTrack<T extends { subject: { id: string } }>(
  items: readonly T[],
): SubjectTrackGroup<T>[] {
  const byId = new Map(items.map((item) => [item.subject.id, item]));
  const used = new Set<string>();
  const groups: SubjectTrackGroup<T>[] = [];

  for (const track of SUBJECT_TRACKS) {
    const trackItems: T[] = [];
    for (const id of track.subjectIds) {
      const item = byId.get(id);
      if (!item || used.has(id)) continue;
      used.add(id);
      trackItems.push(item);
    }
    if (trackItems.length > 0) {
      groups.push({ id: track.id, title: track.title, blurb: track.blurb, items: trackItems });
    }
  }

  const extras = items.filter((item) => !used.has(item.subject.id));
  if (extras.length > 0) {
    groups.push({
      id: 'more',
      title: 'More',
      blurb: 'Additional interview areas.',
      items: extras,
    });
  }

  return groups;
}
