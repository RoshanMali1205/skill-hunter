/**
 * Angular's Router stamps { navigationId } into history.state on every
 * in-app navigation, starting at 1 for the first one in this tab. A value
 * greater than 1 means there is a prior in-app entry to return to; at 1 (or
 * missing, e.g. a fresh load/refresh/direct link) browser back would leave
 * the app entirely, so callers should use a fallback route instead.
 */
export function hasInAppHistory(): boolean {
  const state = window.history.state as { navigationId?: number } | null;
  return typeof state?.navigationId === 'number' && state.navigationId > 1;
}
