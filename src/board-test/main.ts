import { ready } from '../data/idiomDb';
import { generateLevel } from '../game/levelGenerator';
import { buildBoardFromLevel, countActiveCells } from '../game/boardUtils';
import type { LevelData, Cell } from '../types/game';
import './style.css';

const MIN_CELL = 28;
const GAP = 2;
const BOARD_PAD = 6;
const BOARD_BORDER = 1;
const GAME_PAD = 8;

function calcCellSize(cols: number, rows: number, vpW: number, vpH: number): number {
  const containerW = Math.min(vpW, 430) - GAME_PAD * 2;
  const containerH = vpH * 0.55;
  const innerW = containerW - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (cols - 1);
  const innerH = containerH - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (rows - 1);
  return Math.min(innerW / cols, innerH / rows);
}

type VpPreset = { label: string; w: number; h: number };

const VP_PRESETS: VpPreset[] = [
  { label: 'iPhone SE', w: 375, h: 667 },
  { label: 'iPhone 14', w: 390, h: 844 },
  { label: 'iPhone 14 Pro Max', w: 430, h: 932 },
];

let currentVp = VP_PRESETS[0];

type LevelInfo = {
  levelNum: number;
  levelData: LevelData;
  board: Cell[][];
  idiomCount: number;
  rows: number;
  cols: number;
  cellSize375: number;
  cellSize430: number;
  tooSmall375: boolean;
  tooSmall430: boolean;
};

function generate50Levels(): LevelInfo[] {
  const results: LevelInfo[] = [];
  let levelNum = 1;
  let failures = 0;

  while (results.length < 50 && failures < 500) {
    const idiomCount = Math.min(5 + Math.floor((levelNum - 1) / 3), 8);
    const level = generateLevel(levelNum, idiomCount, 12, 12, 100);
    if (!level) {
      failures++;
      continue;
    }
    const board = buildBoardFromLevel(level);
    const rows = board.length;
    const cols = board[0]?.length || 0;
    const cs375 = calcCellSize(cols, rows, 375, 667);
    const cs430 = calcCellSize(cols, rows, 430, 932);

    results.push({
      levelNum,
      levelData: level,
      board,
      idiomCount: level.idioms.length,
      rows,
      cols,
      cellSize375: Math.floor(cs375),
      cellSize430: Math.floor(cs430),
      tooSmall375: cs375 < MIN_CELL,
      tooSmall430: cs430 < MIN_CELL,
    });
    levelNum++;
  }

  return results;
}

function idiomDirectionLabel(d: string) {
  return d === 'horizontal' ? '→' : '↓';
}

function render() {
  const app = document.getElementById('app')!;
  const levels = generate50Levels();

  const vpLabel = `${currentVp.label} (${currentVp.w}×${currentVp.h})`;

  let html = `
  <div class="width-indicator">模擬視窗：${vpLabel}</div>
  <div class="page wide">
    <h1>成語接龍 50 關版面測試</h1>
    <p class="subtitle">每關顯示棋盤 layout、成語資訊、cell size，可切換不同裝置視窗</p>

    <div class="info-box">
      <strong>說明：</strong>棋盤使用與正式版相同的 <code>calcCellSize</code> 動態計算，grid 使用固定 px 值。<br>
      <strong>紅色標記</strong>＝cell size &lt; 28px（棋盤過大，正式版會顯示「棋盤過大」提示）<br>
      <strong>金色格子</strong>＝預設字格（preset）| <strong>虛線格子</strong>＝交叉格（≥2 成語共用）
    </div>

    <div class="toggle-bar">
      ${VP_PRESETS.map(vp => `<button class="toggle-btn ${vp.w === currentVp.w && vp.h === currentVp.h ? 'active' : ''}" data-vpw="${vp.w}" data-vph="${vp.h}">${vp.label}<br>${vp.w}×${vp.h}</button>`).join('')}
      <button class="toggle-btn" id="regen-btn">🔄 重新生成 50 關</button>
    </div>

    <div class="summary-box">
      <strong>統計：</strong>共 ${levels.length} 關 |
      375px 過大：<strong class="danger">${levels.filter(l => l.tooSmall375).length}</strong> 關 |
      430px 過大：<strong class="danger">${levels.filter(l => l.tooSmall430).length}</strong> 關 |
      最大棋盤：<strong>${Math.max(...levels.map(l => l.cols * l.rows))}</strong> 格
      (${Math.max(...levels.map(l => l.cols))}×${Math.max(...levels.map(l => l.rows))})
    </div>
  `;

  for (const info of levels) {
    const { levelNum, levelData, board, rows, cols, idiomCount, cellSize375, cellSize430, tooSmall375, tooSmall430 } = info;

    const cs = calcCellSize(cols, rows, currentVp.w, currentVp.h);
    const tooSmall = cs < MIN_CELL;
    const cellSize = tooSmall ? MIN_CELL : Math.floor(cs);
    const fontSize = cellSize <= 32 ? 13 : cellSize <= 38 ? 14 : cellSize <= 44 ? 16 : 18;

    const crossingSet = new Set<string>();
    const cellIdiomCount: Record<string, number> = {};
    for (const p of levelData.idioms) {
      for (let i = 0; i < p.chars.length; i++) {
        const r = p.direction === 'vertical' ? p.startRow + i : p.startRow;
        const c = p.direction === 'horizontal' ? p.startCol + i : p.startCol;
        const key = `${r},${c}`;
        cellIdiomCount[key] = (cellIdiomCount[key] || 0) + 1;
      }
    }
    for (const [key, cnt] of Object.entries(cellIdiomCount)) {
      if (cnt >= 2) crossingSet.add(key);
    }

    const statusClass = tooSmall ? 'status-danger' : (cs < 32 ? 'status-warn' : 'status-ok');
    const statusLabel = tooSmall ? '❌ 過大' : (cs < 32 ? '⚠ 偏小' : '✅ OK');

    html += `
    <div class="scenario ${tooSmall ? 'scenario-danger' : ''}">
      <div class="scenario-header">
        <span class="scenario-title">關卡 #${levelNum}</span>
        <span class="scenario-tag ${statusClass}">${statusLabel}</span>
      </div>
      <div class="stats-row">
        <span>成語：<strong>${idiomCount}</strong></span>
        <span>棋盤：<strong>${rows}×${cols}</strong></span>
        <span>格子：<strong>${countActiveCells(board)}</strong></span>
        <span>預設：<strong>${levelData.presetCells.length}</strong></span>
        <span>字磚：<strong>${levelData.charBank.length}</strong></span>
      </div>
      <div class="stats-row">
        <span>375px cell：<strong class="${tooSmall375 ? 'danger' : ''}">${cellSize375}px ${tooSmall375 ? '(過大!)' : ''}</strong></span>
        <span>430px cell：<strong class="${tooSmall430 ? 'danger' : ''}">${cellSize430}px ${tooSmall430 ? '(過大!)' : ''}</strong></span>
        <span>${currentVp.label} cell：<strong class="${tooSmall ? 'danger' : ''}">${Math.floor(cs)}px</strong></span>
      </div>

      <div class="game-page variant-dynamic" style="max-width: ${Math.min(currentVp.w, 430)}px;">
        <div class="board-container">
          <div class="board" style="grid-template-columns: repeat(${cols}, ${cellSize}px); grid-template-rows: repeat(${rows}, ${cellSize}px); --cell-size: ${cellSize}px; --cell-font: ${fontSize}px;">
    `;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (!cell.isActive) {
          html += `<div class="board-cell disabled"></div>`;
        } else {
          let cls = 'board-cell active';
          if (cell.isPreset) cls += ' preset';
          else if (crossingSet.has(`${r},${c}`)) cls += ' crossing';
          const text = cell.isPreset ? (cell.currentValue || cell.answer) : cell.answer;
          html += `<div class="${cls}"><span class="cell-text" style="font-size: ${fontSize}px;">${text}</span></div>`;
        }
      }
    }

    html += `
          </div>
        </div>
        <div class="char-bank">
          <div class="char-bank-inner">
    `;

    for (const ch of levelData.charBank) {
      html += `<div class="char-tile">${ch}</div>`;
    }

    html += `
          </div>
        </div>
      </div>

      <div class="idiom-list">
        <strong>成語列表：</strong>
        <table class="idiom-table">
          <thead><tr><th>#</th><th>成語</th><th>方向</th><th>起點</th><th>字數</th></tr></thead>
          <tbody>
    `;

    for (let i = 0; i < levelData.idioms.length; i++) {
      const p = levelData.idioms[i];
      html += `<tr>
        <td>${i + 1}</td>
        <td class="idiom-text">${p.text}</td>
        <td>${idiomDirectionLabel(p.direction)}</td>
        <td>(${p.startRow}, ${p.startCol})</td>
        <td>${p.chars.length}</td>
      </tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>
    </div>

    <div class="separator"></div>
    `;
  }

  html += `</div>`;
  app.innerHTML = html;

  document.querySelectorAll<HTMLButtonElement>('.toggle-btn[data-vpw]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentVp = { label: '', w: Number(btn.dataset.vpw), h: Number(btn.dataset.vph) };
      render();
    });
  });

  document.getElementById('regen-btn')?.addEventListener('click', () => {
    location.reload();
  });
}

ready.then(() => {
  render();
});
