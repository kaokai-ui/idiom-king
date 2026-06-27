import type { IdiomLevel } from '../types/idiomV2';

type AnalyticsValue = string | number | boolean | null | undefined;

type AnalyticsParams = Record<string, AnalyticsValue>;

const IDIOM_V2_LEVEL_EVENT_NAMES: Record<IdiomLevel, string> = {
  elementary: 'select_idiom_level_elementary',
  junior: 'select_idiom_level_junior',
  senior: 'select_idiom_level_senior',
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function removeUndefinedParams(params: AnalyticsParams): Record<string, Exclude<AnalyticsValue, undefined>> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, Exclude<AnalyticsValue, undefined>>;
}

export function trackAnalyticsEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, removeUndefinedParams(params));
}

export function trackIdiomV2LevelSelection(nextLevel: IdiomLevel, previousLevel: IdiomLevel): void {
  if (nextLevel === previousLevel) {
    return;
  }

  trackAnalyticsEvent(IDIOM_V2_LEVEL_EVENT_NAMES[nextLevel], {
    app_name: 'idiom_king_2',
    screen_name: 'home',
    idiom_level: nextLevel,
    previous_idiom_level: previousLevel,
  });
}
