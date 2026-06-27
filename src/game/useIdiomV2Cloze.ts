import { useState, useCallback, useEffect, useRef } from 'react';
import type { IdiomLevel } from '../types/idiomV2';

const BASE = import.meta.env.BASE_URL;

type ClozeEntry = {
  id: string;
  text: string;
  sentences: string[];
};

type ClozeCache = {
  entries: ClozeEntry[];
};

const clozeCache = new Map<IdiomLevel, ClozeCache>();

async function loadClozeData(level: IdiomLevel): Promise<ClozeEntry[]> {
  const cached = clozeCache.get(level);
  if (cached) return cached.entries;

  const resp = await fetch(`${BASE}data/idioms-v2/cloze/${level}.json`);
  if (!resp.ok) throw new Error(`Failed to fetch cloze data for ${level}: ${resp.status}`);
  const entries = await resp.json() as ClozeEntry[];
  clozeCache.set(level, { entries });
  return entries;
}

export type ClozeV2Phase = 'question' | 'correct' | 'wrong' | 'insufficient';

export type ClozeV2Question = {
  sentence: string;
  blankedSentence: string;
  answerIdiom: string;
  answerId: string;
  options: string[];
};

function pickRandom<T>(arr: T[], count: number, exclude?: Set<T>): T[] {
  const pool = exclude ? arr.filter(x => !exclude.has(x)) : [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

function generateV2Question(entries: ClozeEntry[], answerEntry?: ClozeEntry): ClozeV2Question | null {
  if (entries.length < 4) return null;

  const entry = answerEntry ?? entries[Math.floor(Math.random() * entries.length)];
  const sentences = entry.sentences;
  if (!sentences || sentences.length === 0) return null;

  const sentence = sentences[Math.floor(Math.random() * sentences.length)];

  let blanked = sentence;
  let first = true;
  blanked = blanked.replace(new RegExp(entry.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
    if (first) {
      first = false;
      return '____';
    }
    return entry.text;
  });
  if (first) return null;

  const wrongOptions = pickRandom(
    entries.map(e => e.text),
    3,
    new Set([entry.text]),
  );
  if (wrongOptions.length < 3) return null;

  const options = [entry.text, ...wrongOptions];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { sentence, blankedSentence: blanked, answerIdiom: entry.text, answerId: entry.id, options };
}

export function useIdiomV2Cloze(activeLevel: IdiomLevel, onWrong?: (idiomId: string, idiomText: string) => void) {
  const [question, setQuestion] = useState<ClozeV2Question | null>(null);
  const [phase, setPhase] = useState<ClozeV2Phase>('question');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [unfamiliar, setUnfamiliar] = useState<Set<string>>(new Set());
  const usedRef = useRef<Set<string>>(new Set());
  const entriesRef = useRef<ClozeEntry[]>([]);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataReady(false);
    setQuestion(null);
    setPhase('question');
    usedRef.current = new Set();
    entriesRef.current = [];
    setLevel(1);
    setStreak(0);
    setUnfamiliar(new Set());

    loadClozeData(activeLevel).then(entries => {
      if (cancelled) return;
      entriesRef.current = entries;
      setDataReady(true);
    }).catch(() => {
      if (cancelled) return;
      setPhase('insufficient');
      setDataReady(true);
    });

    return () => { cancelled = true; };
  }, [activeLevel]);

  const nextQuestion = useCallback((lvl: number) => {
    const entries = entriesRef.current;
    if (entries.length < 4) {
      setPhase('insufficient');
      return;
    }

    setPhase('question');
    setSelectedIndex(null);

    const unusedEntries = entries.filter(e => !usedRef.current.has(e.id));
    const pool = unusedEntries.length >= 4 ? unusedEntries : entries;
    const answerEntry = pool[Math.floor(Math.random() * pool.length)];

    let q = generateV2Question(pool, answerEntry);
    let attempts = 0;
    while (!q && attempts < 20) {
      const retry = pool[Math.floor(Math.random() * pool.length)];
      q = generateV2Question(pool, retry);
      attempts++;
    }
    if (!q) {
      setPhase('insufficient');
      return;
    }

    usedRef.current.add(q.answerId);
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
      onWrong?.(question.answerId, question.answerIdiom);
    }
  }, [phase, question, onWrong]);

  const onNext = useCallback(() => {
    nextQuestion(level + 1);
  }, [level, nextQuestion]);

  return {
    question, phase, selectedIndex, level, streak, unfamiliar,
    onSelect, onNext, dataReady,
  };
}
