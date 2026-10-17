import { afterEach, describe, expect, it } from 'vitest';
import { hasInAppHistory } from './navigation';

describe('hasInAppHistory', () => {
  afterEach(() => history.replaceState(null, ''));

  it('is false until a later in-app navigation exists', () => {
    history.replaceState(null, '');
    expect(hasInAppHistory()).toBe(false);

    history.replaceState({ navigationId: 1 }, '');
    expect(hasInAppHistory()).toBe(false);

    history.replaceState({ navigationId: '2' }, '');
    expect(hasInAppHistory()).toBe(false);
  });

  it('is true when Angular has recorded a previous in-app entry', () => {
    history.replaceState({ navigationId: 2 }, '');
    expect(hasInAppHistory()).toBe(true);
  });
});
