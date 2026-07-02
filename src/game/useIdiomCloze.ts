import { useState, useCallback, useEffect, useRef } from 'react';
import type { ClozeEntry, ClozeCoreQuestion } from './clozeCore';
import { buildClozeQuestion } from './clozeCore';

type IdiomSentencesMap = Record<string, string[]>;

let idiomTexts: string[] = [];
let clozeEntries: ClozeEntry[] = [];
let entryByText: Map<string, ClozeEntry> = new Map();

const sentencesReady: Promise<void> = import('../data/idiomSentences.json').then(mod => {
  const idiomSentences = (mod.default ?? mod) as IdiomSentencesMap;
  idiomTexts = Object.keys(idiomSentences);
  // v1 has no idiom ids in this dataset, so the text doubles as the id.
  clozeEntries = idiomTexts.map(text => ({ id: text, text, sentences: idiomSentences[text] }));
  entryByText = new Map(clozeEntries.map(e => [e.text, e]));
});

export { sentencesReady };

export type ClozePhase = 'question' | 'correct' | 'wrong';

export type ClozeQuestion = ClozeCoreQuestion;

export function generateQuestion(answerIdiom?: string): ClozeQuestion | null {
  const answerEntry = answerIdiom ? entryByText.get(answerIdiom) : undefined;
  if (answerIdiom && !answerEntry) return null;
  return buildClozeQuestion(clozeEntries, answerEntry);
}

export function useIdiomCloze(onWrong?: (idiomText: string) => void) {
  const [question, setQuestion] = useState<ClozeQuestion | null>(null);
  const [phase, setPhase] = useState<ClozePhase>('question');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [unfamiliar, setUnfamiliar] = useState<Set<string>>(new Set());
  const usedRef = useRef<Set<string>>(new Set());
  const dataReadyRef = useRef(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    sentencesReady.then(() => {
      dataReadyRef.current = true;
      setDataReady(true);
    });
  }, []);

  const nextQuestion = useCallback((lvl: number) => {
    setPhase('question');
    setSelectedIndex(null);

    const unusedIdioms = idiomTexts.filter(t => !usedRef.current.has(t));
    const pool = unusedIdioms.length >= 4 ? unusedIdioms : idiomTexts;
    const answerIdiom = pool[Math.floor(Math.random() * pool.length)];

    let q = generateQuestion(answerIdiom);
    let attempts = 0;
    while (!q && attempts < 20) {
      const retry = pool[Math.floor(Math.random() * pool.length)];
      q = generateQuestion(retry);
      attempts++;
    }
    if (!q) return;

    usedRef.current.add(q.answerIdiom);
    setQuestion(q);
    setLevel(lvl);
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    const timer = setTimeout(() => nextQuestion(1), 0);
    return () => clearTimeout(timer);
  }, [dataReady, nextQuestion]);

  const onSelect = useCallback((idx: number) => {
    if (phase !== 'question' || !question) return;
    setSelectedIndex(idx);
    const chosen = question.options[idx];
    if (chosen === question.answerIdiom) {
      setPhase('correct');
      setStreak(s => s + 1);
    } else {
      setPhase('wrong');
      setStreak(0);
      setUnfamiliar(prev => {
        const next = new Set(prev);
        next.add(question.answerIdiom);
        return next;
      });
      onWrong?.(question.answerIdiom);
    }
  }, [phase, question, onWrong]);

  const onNext = useCallback(() => {
    nextQuestion(level + 1);
  }, [level, nextQuestion]);

  return {
    question, phase, selectedIndex, level, streak, unfamiliar,
    onSelect, onNext,
  };
}
