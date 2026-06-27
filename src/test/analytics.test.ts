import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackAnalyticsEvent, trackIdiomV2LevelSelection } from '../lib/analytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

afterEach(() => {
  delete window.gtag;
});

describe('trackAnalyticsEvent', () => {
  it('does nothing when gtag is unavailable', () => {
    expect(() => {
      trackAnalyticsEvent('test_event', { value: 1 });
    }).not.toThrow();
  });

  it('sends the event with undefined params removed', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackAnalyticsEvent('test_event', {
      value: 1,
      label: 'home',
      ignored: undefined,
    });

    expect(gtag).toHaveBeenCalledWith('event', 'test_event', {
      value: 1,
      label: 'home',
    });
  });
});

describe('trackIdiomV2LevelSelection', () => {
  it('tracks the selected level with a dedicated event name', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackIdiomV2LevelSelection('junior', 'elementary');

    expect(gtag).toHaveBeenCalledWith('event', 'select_idiom_level_junior', {
      app_name: 'idiom_king_2',
      screen_name: 'home',
      idiom_level: 'junior',
      previous_idiom_level: 'elementary',
    });
  });

  it('skips tracking when the selected level is unchanged', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackIdiomV2LevelSelection('senior', 'senior');

    expect(gtag).not.toHaveBeenCalled();
  });
});
