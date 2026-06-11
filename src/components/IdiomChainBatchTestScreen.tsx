import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import ChainBoard from './ChainBoard';
import { buildBoardFromLevel } from '../game/boardUtils';
import { generateLevel } from '../game/levelGenerator';
import { createSeededRandom } from '../lib/utils';
import type { Cell, ChainTestBatch, ChainTestLevelRecord, LevelData } from '../types/game';

type Props = {
  onHome: () => void;
};

const BATCH_STORAGE_KEY = 'idiom-king:chain-test-batch:v1';
const TOTAL_TEST_LEVELS = 50;
const EMPTY_WRONG_CELLS = new Set<string>();
const FIXED_BATCH_ID = 'chain-test-fixed-v1';
const FIXED_BATCH_SEED = 20260611;

function buildSolvedBoard(level: LevelData): Cell[][] {
  return buildBoardFromLevel(level).map(row =>
    row.map(cell => ({
      ...cell,
      currentValue: cell.isActive ? cell.answer : null,
    })),
  );
}

function buildBoardRows(level: LevelData): string[] {
  return buildBoardFromLevel(level).map(row =>
    row.map(cell => (cell.isActive ? cell.answer : '·')).join(' ')
  );
}

function buildLayoutSignature(level: LevelData): string {
  const idiomPart = level.idioms
    .map(idiom => `${idiom.text}:${idiom.direction === 'horizontal' ? 'H' : 'V'}@${idiom.startRow},${idiom.startCol}`)
    .join(' | ');
  const presetPart = level.presetCells
    .map(cell => `${cell.char}@${cell.row},${cell.col}`)
    .join(', ');
  return `${idiomPart} || preset: ${presetPart || 'none'}`;
}

function generateTestLevel(sequence: number, seedBase: number): ChainTestLevelRecord {
  const idiomCount = Math.min(5 + Math.floor((sequence - 1) / 3), 8);

  for (let retry = 0; retry < 24; retry++) {
    const seed = (seedBase + sequence * 1009 + retry * 7919) >>> 0;
    const level = generateLevel(sequence, idiomCount, 12, 12, 100, createSeededRandom(seed));
    if (!level) continue;

    return {
      sequence,
      seed,
      level,
      boardRows: buildBoardRows(level),
      layoutSignature: buildLayoutSignature(level),
    };
  }

  throw new Error(`無法產生第 ${sequence} 關測試資料`);
}

function createBatch(): ChainTestBatch {
  const now = new Date();
  const seedBase = FIXED_BATCH_SEED;
  return {
    batchId: FIXED_BATCH_ID,
    seedBase,
    generatedAt: now.toISOString(),
    levels: Array.from({ length: TOTAL_TEST_LEVELS }, (_, index) => generateTestLevel(index + 1, seedBase)),
  };
}

function readStoredBatch(): ChainTestBatch | null {
  try {
    const raw = window.localStorage.getItem(BATCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChainTestBatch;
    if (!parsed || !Array.isArray(parsed.levels) || parsed.levels.length !== TOTAL_TEST_LEVELS) return null;
    if (parsed.batchId !== FIXED_BATCH_ID || parsed.seedBase !== FIXED_BATCH_SEED) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredBatch(batch: ChainTestBatch): void {
  window.localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batch));
}

const IdiomChainBatchTestScreen: FC<Props> = ({ onHome }) => {
  const [batch, setBatch] = useState<ChainTestBatch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('複製本關資料');

  const loadBatch = useCallback((forceRegenerate: boolean) => {
    setLoading(true);
    setError(null);
    requestAnimationFrame(() => {
      try {
        const nextBatch = !forceRegenerate ? readStoredBatch() ?? createBatch() : createBatch();
        writeStoredBatch(nextBatch);
        setBatch(nextBatch);
        setCurrentIndex(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : '無法產生 50 關測試資料';
        setError(message);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    loadBatch(false);
  }, [loadBatch]);

  const currentRecord = batch?.levels[currentIndex] ?? null;
  const solvedBoard = useMemo(
    () => (currentRecord ? buildSolvedBoard(currentRecord.level) : []),
    [currentRecord],
  );

  const currentPayload = useMemo(() => {
    if (!batch || !currentRecord) return '';
    return JSON.stringify({
      batchId: batch.batchId,
      generatedAt: batch.generatedAt,
      seedBase: batch.seedBase,
      sequence: currentRecord.sequence,
      seed: currentRecord.seed,
      level: currentRecord.level,
      boardRows: currentRecord.boardRows,
      layoutSignature: currentRecord.layoutSignature,
    }, null, 2);
  }, [batch, currentRecord]);

  const handleCopy = useCallback(async () => {
    if (!currentPayload) return;
    try {
      await navigator.clipboard.writeText(currentPayload);
      setCopyLabel('已複製');
      window.setTimeout(() => setCopyLabel('複製本關資料'), 1200);
    } catch {
      setCopyLabel('複製失敗');
      window.setTimeout(() => setCopyLabel('複製本關資料'), 1200);
    }
  }, [currentPayload]);

  if (loading) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <div className="loading-spinner" />
        <p>正在預生成 50 關測試棋盤...</p>
      </div>
    );
  }

  if (error || !batch || !currentRecord) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <p>{error ?? '無法載入測試批次'}</p>
        <button className="btn btn-secondary" onClick={() => loadBatch(true)}>重新產生 50 關</button>
      </div>
    );
  }

  return (
    <div className="page-shell game-page chain-test-page">
      <header className="game-topbar">
        <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        <div className="status-pills">
          <span className="pill">測試關 {currentRecord.sequence}/{batch.levels.length}</span>
          <span className="pill">{currentRecord.level.rows}×{currentRecord.level.cols}</span>
        </div>
      </header>

      <section className="chain-test-summary">
        <p className="chain-test-summary-title">成語接龍 50 關測試批次</p>
        <p className="chain-test-summary-text">
          這是固定 seed 的 50 關測試批次。回報問題時請提供批次 ID 與關卡序號，方便直接重現同一版棋盤排列。
        </p>
        <p className="chain-test-summary-code">Batch ID: {batch.batchId}</p>
      </section>

      <div className="chain-test-idioms">
        {currentRecord.level.idioms.map(idiom => (
          <span key={`${currentRecord.sequence}-${idiom.id}-${idiom.startRow}-${idiom.startCol}`} className="pill">
            {idiom.text}
          </span>
        ))}
      </div>

      <ChainBoard
        board={solvedBoard}
        selectedCell={null}
        wrongCells={EMPTY_WRONG_CELLS}
        phase="playing"
        onCellClick={() => {}}
      />

      <details className="chain-test-detail">
        <summary>查看本關記錄資料</summary>
        <div className="chain-test-meta">
          <p><strong>關卡序號：</strong>{currentRecord.sequence}</p>
          <p><strong>關卡 Seed：</strong>{currentRecord.seed}</p>
          <p><strong>生成時間：</strong>{batch.generatedAt}</p>
          <p><strong>排列摘要：</strong>{currentRecord.layoutSignature}</p>
          <div className="chain-test-board-rows">
            <strong>棋盤字面：</strong>
            <pre>{currentRecord.boardRows.join('\n')}</pre>
          </div>
          <div className="chain-test-board-rows">
            <strong>完整 JSON：</strong>
            <pre>{currentPayload}</pre>
          </div>
        </div>
      </details>

      <div className="action-buttons chain-test-actions">
        <div className="action-row">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentIndex(index => Math.max(0, index - 1))}
            disabled={currentIndex === 0}
          >
            上一關
          </button>
          <button
            className="btn btn-skip"
            onClick={() => setCurrentIndex(index => Math.min(batch.levels.length - 1, index + 1))}
            disabled={currentIndex >= batch.levels.length - 1}
          >
            跳關
          </button>
        </div>
        <div className="action-row">
          <button className="btn btn-secondary" onClick={handleCopy}>{copyLabel}</button>
          <button className="btn btn-primary" onClick={() => loadBatch(true)}>重新產生 50 關</button>
        </div>
      </div>
    </div>
  );
};

export default IdiomChainBatchTestScreen;
