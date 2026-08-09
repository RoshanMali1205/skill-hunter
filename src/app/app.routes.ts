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
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout').then((m) => m.AuthLayoutComponent),
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
    // Authenticated chrome is a route layout — not toggled by an auth signal.
    // That avoids login/logout flashing the wrong shell around the current URL.
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
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
        loadComponent: () =>
          import('./features/practice/practice').then((m) => m.PracticeComponent),
        title: 'Practice · Skill Hunter',
      },
      {
        path: 'playground',
        loadComponent: () =>
          import('./features/playground/playground').then((m) => m.PlaygroundComponent),
        title: 'Playground · Skill Hunter',
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar').then((m) => m.CalendarComponent),
        title: 'Calendar · Skill Hunter',
      },
      {
        path: 'bookmarks',
        loadComponent: () =>
          import('./features/bookmarks/bookmarks').then((m) => m.BookmarksComponent),
        title: 'Bookmarks · Skill Hunter',
      },
      {
        path: 'notes',
        loadComponent: () => import('./features/notes/notes').then((m) => m.NotesComponent),
        title: 'Notes · Skill Hunter',
      },
      {
        path: 'revision',
        loadComponent: () =>
          import('./features/revision/revision').then((m) => m.RevisionComponent),
        title: 'Revision · Skill Hunter',
      },
      {
        path: 'achievements',
        loadComponent: () =>
          import('./features/achievements/achievements').then((m) => m.AchievementsComponent),
        title: 'Achievements · Skill Hunter',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.SettingsComponent),
        title: 'Settings · Skill Hunter',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
