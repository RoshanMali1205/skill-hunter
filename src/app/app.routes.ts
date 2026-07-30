import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    // Checked first and only on an exact "/" match, so root always falls
    // through to the dashboard guard instead of being silently absorbed by
    // the auth-layout route below (which would match "/" with no active
    // child and never redirect).
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout').then((m) => m.AuthLayoutComponent),
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
        title: 'Sign In · Skill Hunter',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then((m) => m.RegisterComponent),
        title: 'Create Account · Skill Hunter',
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
    title: 'Dashboard · Skill Hunter',
  },
  {
    path: 'subjects',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/subjects/subject-list').then((m) => m.SubjectListComponent),
    title: 'Subjects · Skill Hunter',
  },
  {
    path: 'subjects/:subjectId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/subjects/subject-detail').then((m) => m.SubjectDetailComponent),
    title: 'Subject · Skill Hunter',
  },
  {
    path: 'subjects/:subjectId/topics/:topicId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/topics/topic-detail').then((m) => m.TopicDetailComponent),
    title: 'Topic · Skill Hunter',
  },
  {
    path: 'ai-mentor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/ai-mentor/ai-mentor').then((m) => m.AiMentorComponent),
    title: 'AI Mentor · Skill Hunter',
  },
  {
    path: 'practice',
    canActivate: [authGuard],
    loadComponent: () => import('./features/practice/practice').then((m) => m.PracticeComponent),
    title: 'Practice · Skill Hunter',
  },
  {
    path: 'playground',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/playground/playground').then((m) => m.PlaygroundComponent),
    title: 'Playground · Skill Hunter',
  },
  {
    path: 'calendar',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calendar/calendar').then((m) => m.CalendarComponent),
    title: 'Calendar · Skill Hunter',
  },
  {
    path: 'bookmarks',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookmarks/bookmarks').then((m) => m.BookmarksComponent),
    title: 'Bookmarks · Skill Hunter',
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notes/notes').then((m) => m.NotesComponent),
    title: 'Notes · Skill Hunter',
  },
  {
    path: 'revision',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/revision/revision').then((m) => m.RevisionComponent),
    title: 'Revision · Skill Hunter',
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings').then((m) => m.SettingsComponent),
    title: 'Settings · Skill Hunter',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
