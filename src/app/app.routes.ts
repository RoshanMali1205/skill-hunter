import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
    title: 'Dashboard · Skill Hunter',
  },
  {
    path: 'subjects',
    loadComponent: () =>
      import('./features/subjects/subject-list').then((m) => m.SubjectListComponent),
    title: 'Subjects · Skill Hunter',
  },
  {
    path: 'subjects/:subjectId',
    loadComponent: () =>
      import('./features/subjects/subject-detail').then((m) => m.SubjectDetailComponent),
    title: 'Subject · Skill Hunter',
  },
  {
    path: 'subjects/:subjectId/topics/:topicId',
    loadComponent: () =>
      import('./features/topics/topic-detail').then((m) => m.TopicDetailComponent),
    title: 'Topic · Skill Hunter',
  },
  {
    path: 'ai-mentor',
    loadComponent: () =>
      import('./features/ai-mentor/ai-mentor').then((m) => m.AiMentorComponent),
    title: 'AI Mentor · Skill Hunter',
  },
  {
    path: 'practice',
    loadComponent: () => import('./features/practice/practice').then((m) => m.PracticeComponent),
    title: 'Practice · Skill Hunter',
  },
  {
    path: 'calendar',
    loadComponent: () => import('./features/calendar/calendar').then((m) => m.CalendarComponent),
    title: 'Calendar · Skill Hunter',
  },
  {
    path: 'bookmarks',
    loadComponent: () =>
      import('./features/bookmarks/bookmarks').then((m) => m.BookmarksComponent),
    title: 'Bookmarks · Skill Hunter',
  },
  {
    path: 'revision',
    loadComponent: () =>
      import('./features/revision/revision').then((m) => m.RevisionComponent),
    title: 'Revision · Skill Hunter',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings').then((m) => m.SettingsComponent),
    title: 'Settings · Skill Hunter',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
