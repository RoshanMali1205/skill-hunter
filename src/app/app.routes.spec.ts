import { describe, expect, it } from 'vitest';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { routes } from './app.routes';

describe('routes', () => {
  const guest = routes[1];
  const shell = routes[2];

  it('sends the exact root path and unknown paths to the dashboard', () => {
    expect(routes[0]).toMatchObject({ path: '', redirectTo: 'dashboard', pathMatch: 'full' });
    expect(routes.at(-1)).toMatchObject({ path: '**', redirectTo: 'dashboard' });
  });

  it('guards guest screens separately from the authenticated shell', () => {
    expect(guest?.canActivate).toEqual([guestGuard]);
    expect(guest?.children?.map((route) => route.path)).toEqual(['login', 'register']);
    expect(shell?.canActivate).toEqual([authGuard]);
    expect(shell?.children?.map((route) => route.path)).toEqual([
      'dashboard',
      'subjects',
      'subjects/:subjectId',
      'subjects/:subjectId/topics/:topicId',
      'ai-mentor',
      'practice',
      'mock-interview',
      'playground',
      'calendar',
      'bookmarks',
      'notes',
      'revision',
      'achievements',
      'export',
      'settings',
    ]);
  });

  it('titles every screen and asks mock interview before leaving', () => {
    const screens = [...(guest?.children ?? []), ...(shell?.children ?? [])];
    expect(screens.every((route) => String(route.title).includes('Skill Hunter'))).toBe(true);

    const interview = shell?.children?.find((route) => route.path === 'mock-interview');
    const canLeave = interview?.canDeactivate?.[0] as (component: {
      canLeave(): boolean;
    }) => boolean;
    expect(canLeave({ canLeave: () => true })).toBe(true);
    expect(canLeave({ canLeave: () => false })).toBe(false);
  });
});
