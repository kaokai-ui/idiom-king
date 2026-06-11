export const ChainPhase = {
  playing: 'playing',
  checking: 'checking',
  complete: 'complete',
  generating: 'generating',
  error: 'error',
} as const;

export type ChainPhase = (typeof ChainPhase)[keyof typeof ChainPhase];
