import type { IdiomLevel } from '../types/idiomV2';

export const IDIOM_LEVELS: IdiomLevel[] = ['elementary', 'junior', 'senior'];

export const IDIOM_LEVEL_LABELS: Record<IdiomLevel, string> = {
  elementary: '國小',
  junior: '國中',
  senior: '高中以上',
};

export const DEFAULT_IDIOM_LEVEL: IdiomLevel = 'elementary';

export const LATE_SHOW_IDIOMS: Record<IdiomLevel, Record<string, number>> = {
  elementary: {
    idiom2_2141: 200,
  },
  junior: {},
  senior: {},
};
