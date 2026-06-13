import { useState, useCallback, useEffect, useRef } from 'react';

type IdiomSentencesMap = Record<string, string[]>;

let idiomSentences: IdiomSentencesMap | null = null;
let idiomTexts: string[] = [];

const sentencesReady: Promise<void> = import('../data/idiomSentences.json').then(mod => {
  idiomSentences = (mod.default ?? mod) as IdiomSentencesMap;
  idiomTexts = Object.keys(idiomSentences);
});

export { sentencesReady };

export type ClozePhase = 'question' | 'correct' | 'wrong';

export type ClozeQuestion = {
  sentence: string;
  blankedSentence: string;
  answerIdiom: string;
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

export function generateQuestion(answerIdiom?: string): ClozeQuestion | null {
  if (idiomTexts.length < 4) return null;

  const answer = answerIdiom ?? idiomTexts[Math.floor(Math.random() * idiomTexts.length)];
  const sentences = idiomSentences![answer];
  if (!sentences || sentences.length === 0) return null;

  const sentence = sentences[Math.floor(Math.random() * sentences.length)];

  let blanked = sentence;
  let first = true;
  blanked = blanked.replace(new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
    if (first) {
      first = false;
      return '____';
    }
    return answer;
  });
  if (first) return null;

  const wrongOptions = pickRandom(
    idiomTexts,
    3,
    new Set([answer])
  );
  if (wrongOptions.length < 3) return null;

  const options = [answer, ...wrongOptions];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { sentence, blankedSentence: blanked, answerIdiom: answer, options };
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
