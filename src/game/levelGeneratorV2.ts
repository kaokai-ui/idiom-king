// The v2 generator is identical to the v1 crossword algorithm; the only
// difference is that v2 always supplies an explicit idiom pool + char index
// (per-level data), so it simply re-exports the shared core. `IdiomV2Entry`
// structurally satisfies `GeneratorIdiom` (it has id/text/chars).
export { generateLevelFromPool } from './levelGenCore';
