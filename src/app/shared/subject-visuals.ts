export interface SubjectVisual {
  emoji: string;
  color: string;
}

const SUBJECT_VISUALS: Record<string, SubjectVisual> = {
  angular: { emoji: '🅰️', color: '#dd0031' },
  javascript: { emoji: '🟨', color: '#d97706' },
  typescript: { emoji: '🔷', color: '#3178c6' },
  ui: { emoji: '🎨', color: '#ec4899' },
  'system-design': { emoji: '🏗️', color: '#8b5cf6' },
};

const FALLBACK_VISUAL: SubjectVisual = { emoji: '📘', color: '#6b7280' };

export function subjectVisual(id: string): SubjectVisual {
  return SUBJECT_VISUALS[id] ?? FALLBACK_VISUAL;
}
