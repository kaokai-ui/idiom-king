# 我是成語王 — 開發文件

## 專案概覽

「我是成語王」是一個成語學習 Web App，提供閃卡練習、成語接龍填字遊戲與成語填空（Cloze）三大功能，另外也提供固定 seed 的 50 關成語接龍測試頁，方便在手機、平板與桌機上逐關檢查棋盤版面。使用者可透過閃卡瀏覽成語的注音、用法說明與釋義，並將成語標記為「生詞」或「已會」；成語接龍是以 crossword 方式填入正確漢字完成闖關；成語填空則是看例句選成語的四選一遊戲。

- **Tech Stack**: React 19 + TypeScript + Vite
- **資料來源**: `idioms.xlsx`（A:編號, B:成語, C:注音, D:用法說明, E:釋義），共 1659 筆
- **例句來源**: `中文字1.xlsx` Major 工作表（B:成語, C:例句，換行分隔），1662 成語 / 11581 例句
- **持久化**: localStorage（settings / progress / session）
- **無後端**: 純前端 SPA

---

## 專案架構

```
idiom-king/
├── index.html # 入口 HTML，title=我是成語王
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts
├── src/
│   ├── main.tsx # React 入口，掛載 <App />
│   ├── App.tsx # 畫面路由：根據 session.screen 切換 Home / Flashcard / Chain / ChainTest / Cloze
│   ├── index.css # 全域樣式（CSS 變數、所有畫面樣式）
│   │
│   ├── types/
│   │   └── game.ts # 所有 TypeScript 型別定義
│   │
│   ├── data/
│   │   ├── idioms.json # 1659 筆成語資料（從 xlsx 解析）
│   │   ├── idiomSentences.json # 1662 成語的例句（從中文字1.xlsx 解析）
│   │   └── idiomDb.ts # 匯出 idioms 陣列 + idiomsById + idiomIdByText 查找表
│   │
│   ├── lib/
│   │   ├── storage.ts # localStorage 讀寫 + 預設值
│   │   └── utils.ts # 共用工具：shuffle、seeded random、createPracticeDeck、countProgress
│   │
│   ├── state/
│   │   ├── actionTypes.ts # Action 常數定義
│   │   ├── reducers.ts # 三個獨立 reducer：settings / progress / session
│   │   └── appReducer.ts # 組合式 root reducer
│   │
│   ├── hooks/
│   │   └── useIdiomApp.ts # 主 Hook：useReducer + localStorage 同步 + 閃卡邏輯
│   │
│   ├── game/
│   │   ├── levelGenerator.ts # crossword 關卡生成 + seeded random 支援 + board/tile 建構 + 驗證函數
│   │   ├── useChainState.ts # 接龍遊戲 reducer state + 關卡載入流程
│   │   ├── useIdiomChain.ts # 接龍遊戲 Hook：狀態管理 + 互動邏輯 + 自動檢查
│   │   └── useIdiomCloze.ts # 填空遊戲 Hook：出題 + 四選一 + 連續答對 + 陌生成語
│   │
│   └── components/
│       ├── HomeScreen.tsx # 首頁：統計、五個遊戲入口、陌生成語/已會成語列表、進度、設定
│       ├── FlashcardScreen.tsx # 閃卡畫面：注音/用法/釋義 toggle、生詞/已會/下一個
│       ├── IdiomChainScreen.tsx # 接龍主畫面：組合 Board + CharBank + HintPanel + Actions
│       ├── IdiomChainBatchTestScreen.tsx # 接龍 50 關測試頁：固定 seed 批次、跳關、顯示關卡資料
│       ├── IdiomClozeScreen.tsx # 填空主畫面：例句 + 四選一 + 陌生成語標籤
│       ├── ChainBoard.tsx # crossword 棋盤 grid（動態 cell size）
│       ├── ChainBoardCell.tsx # 單一格子元件（preset/selected/wrong/correct 狀態）
│       ├── ChainCharBank.tsx # 字根區按鈕列表
│       ├── ChainHintPanel.tsx # 提示面板：成語列表 + 展開用法說明
│       └── ChainActions.tsx # 動作按鈕區：刪除、清除、下一關、跳關、重新挑戰
```

---

## 型別定義 (`types/game.ts`)

| 型別 | 用途 |
|------|------|
| `IdiomEntry` | 成語資料：id, text, chars[], uniqueChars[], charCountMap, bopomofo, usage, definition |
| `Cell` | 棋盤格子：row, col, isActive, answer, currentValue, idiomIds[], isPreset |
| `CharTile` | 字根牌：id, value, used, cellRef |
| `PlacedIdiom` | 已放置的成語：id, text, chars[], direction, startRow, startCol |
| `LevelData` | 關卡資料：id, rows, cols, idioms[], charBank[], presetCells[] |
| `ChainTestLevelRecord` | 測試關卡記錄：sequence, seed, level, boardRows, layoutSignature |
| `ChainTestBatch` | 50 關測試批次：batchId, seedBase, generatedAt, levels[] |
| `AppScreen` | 畫面列舉：`'home' \| 'flashcardRandom' \| 'flashcardUnfamiliar' \| 'idiomChain' \| 'idiomChainTest' \| 'idiomCloze'` |
| `FlashcardState` | 閃卡狀態：mode, idiomIds[], currentIndex, showBopomofo/Usage/Definition |
| `AppSession` | 執行階段：screen, flashcards |
| `AppSettings` | 使用者設定：autoShowBopomofo/Usage/Definition, developerMode |
| `AppProgress` | 學習進度：starredIds[], knownIds[], wordStats{} |
| `WordStats` | 單字統計：seenCount, lastSeenAt |
| `Direction` | 方向：`'horizontal' \| 'vertical'` |
| `ClozePhase` | 填空階段：`'question' \| 'correct' \| 'wrong'` |
| `ClozeQuestion` | 填空題目：sentence, blankedSentence, answerIdiom, options[] |

---

## 狀態管理

### 架構

採用 `useReducer` 模式，三個獨立 reducer 組合為 `appReducer`：

```
AppState {
  settings: AppSettings ← settingsReducer
  progress: AppProgress ← progressReducer
  session: AppSession   ← sessionReducer
}
```

### Action 一覽

| Action | Payload | 處理 Reducer | 說明 |
|--------|---------|-------------|------|
| `HYDRATE` | `{ settings, progress, session }` | settings, progress, session | 從 localStorage 恢復（使用 readSettings/readProgress/readSession 含 default merge） |
| `GO_HOME` | — | session | 返回首頁 |
| `OPEN_SCREEN` | `AppScreen` | session | 切換畫面 |
| `TOGGLE_SETTING` | `keyof AppSettings` | settings | 切換設定開關 |
| `TOGGLE_STARRED` | `idiomId: string` | progress | 加入/移除生詞表 |
| `TOGGLE_KNOWN` | `idiomId: string` | progress | 加入/移除已會 |
| `MARK_SEEN` | `{ idiomId, seenAt }` | progress | 記錄瀏覽次數 |
| `START_FLASHCARDS` | `{ mode, idiomIds, show* }` | session | 開始閃卡練習 |
| `ADVANCE_FLASHCARD` | `{ idiomIds }` | session | 下一張閃卡 |
| `TOGGLE_FLASHCARD_PANEL` | `'showBopomofo' \| 'showUsage' \| 'showDefinition'` | session | 切換閃卡面板顯示 |

### localStorage 持久化

- `idiom-king:settings` — AppSettings
- `idiom-king:progress` — AppProgress
- `idiom-king:session` — AppSession

`useIdiomApp` 中以 `useEffect` 監聽各 state 變化自動寫入，啟動時以 `HYDRATE` action 讀回（透過 `readSettings/readProgress/readSession` 確保新欄位有預設值）。

---

## 主 Hook：useIdiomApp

**職責**：整個 App 的狀態中樞

1. `useReducer(appReducer, createInitialState)` 初始化（含 localStorage 讀取）
2. 三個 `useEffect` 將 settings / progress / session 寫入 localStorage
3. 一個 `useEffect` 在啟動時 dispatch `HYDRATE`（使用 readSettings/readProgress/readSession）
4. `stats` = `countProgress(progress, idioms)` — 計算總數/已會/陌生/進度率
5. `currentFlashcardIdiom` — 根據 session.flashcards 計算當前成語
6. `MARK_SEEN` effect — 進入閃卡時自動記錄瀏覽
7. 各 callback：goHome, openScreen, toggleSetting, toggleStarred, toggleKnown, startFlashcards, advanceFlashcard, toggleFlashcardPanel

---

## 閃卡練習

### 流程

1. 使用者點選「隨機閃卡」或「陌生閃卡」
2. `startFlashcards(mode)` 呼叫 `createPracticeDeck`
   - `random`：篩選非 starred + 非 known 的成語，shuffle
   - `unfamiliar`：篩選 starred 的成語，shuffle
3. dispatch `START_FLASHCARDS`，session.screen 切換，flashcards 狀態初始化
4. `FlashcardScreen` 顯示當前成語，toggle 注音/用法/釋義
5. 點「下一個」→ `advanceFlashcard`：index+1，到底時重新 shuffle
6. 點「加入生詞表」→ `toggleStarred`；點「加入已會」→ `toggleKnown`

### 卡片顯示

- 預設是否顯示注音/用法/釋義由 `settings.autoShow*` 決定
- 閃卡內的 toggle 即時切換 `session.flashcards.show*`

---

## 成語接龍

### 關卡生成 (`levelGenerator.ts`)

1. `generateLevel(levelId, targetCount, maxRows, maxCols, maxAttempts, random?)`
   - 多次嘗試 `tryGenerateLevel`，直到成功或用完次數
2. `tryGenerateLevel`：
   - 建立空棋盤 (maxRows × maxCols)
   - 隨機放置第一個成語（水平，置中）
   - 之後每個成語交替方向（垂直/水平），尋找與已放置成語的交叉位置
   - `canPlaceIdiom` 檢查：邊界內、字元一致或空格、相鄰格不衝突
   - 成功放置 ≥ targetCount 即回傳
3. 修剪棋盤邊界（移除空白行列）
4. **棋盤尺寸檢查**：計算動態 cell size，若最小 28px 仍塞不進 430px 寬 / 55%高則回傳 `null` 重新生成
5. 選取 crossing cells（被 ≥2 個成語共用）作為預設字格（2~3 個，金色邊框）
6. charBank 按**格子去重**產生字磚（`charBankKeys` Set），只排除預設格，最後 shuffle
7. 可注入 `random()`，讓特定關卡批次可重現（例如固定 seed 的 50 關測試頁）

### Board 資料結構

- `buildBoardFromLevel(level)` → `Cell[][]`
- 每格 `isActive` / `isPreset` / `answer` / `currentValue` / `idiomIds[]`
- 預設格已填入 `currentValue`，不可修改

### 動態 Cell Size (`ChainBoard.tsx`)

- `calcCellSize(cols, rows, containerW, containerH)` — 根據棋盤格數與可用空間計算 cell 大小
- 精確計算所有 CSS 間距：game padding、board border、board padding、grid gap
- 不使用 `Math.max(MIN_CELL, size)` clamp — 避免 cell 被強制放大導致棋盤溢出容器
- 若計算出的 `raw < MIN_CELL(28px)` → 顯示「棋盤過大」提示，不再渲染 overlap 棋盤
- 字體等比縮放（28→13px, 32→14px, 38→14px, 44→16px, 其他→18px）
- CSS 變數 `--cell-size` / `--cell-font` 由 inline style 動態設定
- grid template 使用固定 px 值而非 `1fr`，避免 cell overflow/overlap
- responsive media query **不得覆蓋** `.board-cell` 的 `--cell-size` / `--cell-font`，否則桌機和平板上會出現 grid 軌道與 cell 本體尺寸不一致，造成交叉格錯位

### 遊戲互動 (`useIdiomChain.ts`)

**狀態**：

| 狀態 | 型別 | 說明 |
|------|------|------|
| `level` | `LevelData \| null` | 當前關卡 |
| `board` | `Cell[][]` | 棋盤 |
| `charTiles` | `CharTile[]` | 字根牌 |
| `selectedCell` | `{row,col} \| null` | 選中格子 |
| `phase` | `ChainPhase` | `'generating' \| 'playing' \| 'checking' \| 'complete' \| 'error'` |
| `wrongCells` | `Set<string>` | 錯誤格子集合 |
| `filledCount` | `number` | 已填格子數 |
| `hintVisible` | `boolean` | 提示面板開關 |
| `expandedIdiomId` | `string \| null` | 展開用法的成語 ID |

**Phase 流程**：

```
generating → playing ⇄ checking → complete
    ↓
  error（生成失敗，顯示跳過按鈕）
```

1. **generating**: `loadLevel()` 以 `requestAnimationFrame` 啟動生成流程；`loadLevel` 需保持穩定 reference，避免 `useEffect` 反覆觸發導致無限回到 loading
2. **playing**: 使用者點選格子 → 選取；點選字根牌 → 放入格子
3. **自動檢查**: `filledCount` 變化時，若棋盤已滿 → `doCheck()`
   - 全對 → `complete`
   - 有錯 → 標記 `wrongCells`，進入 `checking`
4. **checking**:
   - 錯誤格子顯示紅色，使用者可點選並修改
   - 修改某格時，該格從 `wrongCells` 移除
   - 當 `wrongCells` 清空且棋盤仍滿 → 自動重新檢查
   - 全對 → `complete`；否則 → 回到 `playing`（等待再次填滿觸發檢查）
5. **complete**: 顯示過關訊息，可「重新挑戰」或「下一關」
6. **error**: 關卡生成失敗，顯示「關卡生成失敗」+ 跳過按鈕

**格子選取自動推進**：放入字根後，自動跳到下一個空的非預設格子。

**提示面板**：
- 預設隱藏，點「顯示提示」展開
- 列出關卡中所有成語文字
- 點選成語可展開「用法說明」

**開發者模式**：
- 首頁設定 toggle 開關
- 接龍遊戲中開啟後出現「跳關」按鈕（虛線金色邊框）

### 50 關測試頁 (`IdiomChainBatchTestScreen.tsx`)

- 首頁提供「接龍測試 50 關」入口，獨立於正式闖關頁
- 使用固定批次 `chain-test-fixed-v1`
- 固定 `seedBase = 20260611`，讓手機 / 平板 / 桌機看到相同 50 關
- 每關記錄：
  - 關卡序號 `sequence`
  - 關卡 seed
  - `level` 完整資料
  - `boardRows` 文字化棋盤
  - `layoutSignature` 排列摘要
- 測試頁會直接顯示答案棋盤，方便人工檢查 cell overlap / 交叉點錯位
- 底部提供上一關 / 跳關 / 複製本關資料 / 重新產生批次

---

## 成語填空 (Cloze)

### 資料來源

`idiomSentences.json` — 從 `中文字1.xlsx` Major 工作表解析：
- 1662 成語，共 11581 例句
- 每個成語 1~16 個例句（平均 7 個）
- 2 個成語無例句（已排除）

### 遊戲邏輯 (`useIdiomCloze.ts`)

**出題流程**：
1. 從未出過的成語池中隨機選一個作為答案
2. 從該成語的例句中隨機選一句
3. 將例句中**第一次出現**的答案成語替換為 `____`
4. 從其他成語中隨機選 3 個作為干擾選項
5. 4 個選項隨機排列（A/B/C/D）

**狀態**：

| 狀態 | 型別 | 說明 |
|------|------|------|
| `question` | `ClozeQuestion \| null` | 當前題目 |
| `phase` | `ClozePhase` | `'question' \| 'correct' \| 'wrong'` |
| `selectedIndex` | `number \| null` | 選中的選項索引 |
| `level` | `number` | 題號（遞增） |
| `streak` | `number` | 連續答對次數 |
| `unfamiliar` | `Set<string>` | 答錯的成語文字集合 |

**互動**：
- 選對 → `correct` phase，綠色高亮，streak+1
- 選錯 → `wrong` phase，紅色高亮選錯項+綠色高亮正確項，streak 歸零
- 答錯時自動呼叫 `onWrong(idiomText)` → 透過 `idiomIdByText` 查出 ID → `toggleStarred(id)` 存入陌生成語清單
- 點「下一題/繼續」→ 下一題
- 畫面下方顯示陌生成語標籤（累積）

---

## 首頁設計

### 五大區塊

1. **頂部統計面板**: 成語典數量 / 已學會 / 陌生成語
2. **五個遊戲入口**: 隨機閃卡 / 陌生閃卡 / 成語接龍 / 接龍測試 50 關 / 成語填空
3. **卡片式列表**:
   - 陌生成語（starredIds）— 卡片顯示數量，點擊展開預覽前 8 筆，點「查看全部」進入列表頁，每個成語可展開用法說明、可移除
   - 已會成語（knownIds）— 同上
4. **進度統計**: 進度條 + 百分比
5. **功能設定**: 四個 toggle switch
   - 預設顯示注音
   - 預設顯示用法說明
   - 預設顯示釋義
   - 開發者模式

---

## 配色方案

採用中國水墨風格，朱紅+金色+墨色：

| 變數 | 色值 | 用途 |
|------|------|------|
| `--accent` | `#c23a2e` | 朱紅，主強調色、按鈕、錯誤 |
| `--accent-strong` | `#a12a20` | 深朱紅，hover |
| `--accent-soft` | `#f5ddd9` | 淡朱紅，選取格背景 |
| `--gold` | `#c8962e` | 金色，數字、提示、預設格 |
| `--gold-soft` | `#fdf0d5` | 淡金，生詞標籤、設定背景 |
| `--gold-strong` | `#a67b1e` | 深金，提示文字 |
| `--ink` | `#3a2a1e` | 墨色，主文字 |
| `--success` | `#2e7d5a` | 綠色，已會、正確 |
| `--bg` | `#f7f3ed` | 宣紙色背景 |
| `--panel` | `rgba(255,252,246,0.88)` | 面板 |

---

## 手機優化

- 接龍/填空畫面 `max-width: 430px`，使用 `100dvh` 適應手機
- 棋盤 cell size 動態計算（精確含 border/gap/pad），CSS 變數 `--cell-size` / `--cell-font`
- 若計算出 cell size < 28px → 顯示「棋盤過大」提示（不渲染 overlap 棋盤）
- 字根牌 36×40px，緊湊排列
- 提示面板可收合，`max-height: 140px` 可捲動
- 所有互動元素 ≥ 36px 觸控目標

---

## Build 指令

```bash
npm run dev    # 開發伺服器
npm run build  # TypeScript 檢查 + Vite 生產建置
npm run preview # 預覽建置結果
```

建置輸出至 `dist/`，含 index.html + CSS + JS。

---

## 重構清單

### 已修正

| # | 類別 | 問題 | 檔案 | 說明 |
|---|------|------|------|------|
| B1 | Bug | charBank 交叉格重複字磚 | `levelGenerator.ts` | 改用 `charBankKeys` Set 按格子去重 |
| B2 | Bug | hero-logo base width 640px | `index.css:60` | 改為 220px |
| B3 | Bug | 響應式 logo 尺寸錯誤 | `index.css` | 431px→240px, 768px→400px |
| B4 | Bug | ChainBoardCell null 比較 | `ChainBoardCell.tsx:21` | 加入 `cell.currentValue !== null` guard |
| B5 | Bug | 成語標點未移除 | `idioms.json` | 4 筆含「，」的成語 text/chars/uniqueChars/charCountMap 全部去除標點 |
| B6 | Bug | HYDRATE 不含 default merge | `useIdiomApp.ts:33-38` | 改用 readSettings/readProgress/readSession（含 `{...default, ...stored}` merge） |
| B7 | Bug | 關卡生成失敗永遠載入中 | `useIdiomChain.ts:36` | 新增 `error` phase + 跳過按鈕 UI |
| B8 | Bug | 棋盤 cell 固定 46px 導致 overflow | `ChainBoard.tsx`, `index.css` | 改為動態計算 cell size + CSS 變數 `--cell-size` |
| B9 | Bug | 棋盤太大仍生成（無法塞入畫面） | `levelGenerator.ts:188-193` | 生成後計算動態 cell size，最小 28px 仍塞不下則回傳 null |
| B10 | Bug | `calcCellSize` clamp 到 MIN_CELL 造成 overlap | `ChainBoard.tsx:26` | 舊版 `Math.max(28, size)` 當 size<28 時強制 28px，但 28px×cols 總寬超出容器 → 格子 overlap+超出邊界。修正：不再 clamp，改為顯示「棋盤過大」提示；同時 levelGenerator 改用最小 viewport(375×667) 做尺寸檢查，12 欄一律拒絕 |
| B11 | Bug | 成語接龍主頁無限停在「正在生成關卡」 | `useChainState.ts`, `useIdiomChain.ts` | `loadLevel` 原本每次 render 都是新函式，導致 `useEffect([loadLevel])` 重複觸發並持續重設 `phase='generating'`。修正：`loadLevel` 改用 `useCallback` 穩定 reference |
| B12 | Bug | iPad / PC 上棋盤交叉格錯位疊放 | `index.css`, `ChainBoard.tsx` | responsive breakpoint 曾覆蓋 `.board-cell` 的 `--cell-size` / `--cell-font`，使 grid track 尺寸和 cell 本體尺寸不同步；iPhone 未觸發 breakpoint 時正常。修正：移除 media query 中對 `.board-cell` 的尺寸覆蓋，統一只使用 `ChainBoard` runtime 計算值 |
| R1 | 結構 | HomeScreen 分離為首頁+IdiomDetailScreen | `HomeScreen.tsx`, `IdiomDetailScreen.tsx`, `App.tsx` | HomeScreen 只含首頁邏輯；IdiomDetailScreen 為獨立元件；App.tsx 管理 detailView 狀態 |
| R2 | 結構 | useIdiomChain 重構，使用 useChainState | `useChainState.ts`, `useIdiomChain.ts` | 新增 `useChainState` sub-hook，以 `useReducer` 取代 11 個 `useState`；原子化狀態更新 |
| R3 | 型別 | Action 型別改為 discriminated union | `actionTypes.ts` | 新增 `AppAction` 型別，每個 action 有專屬 payload 型別，不再用 `payload?: unknown` |
| R4 | 型別 | Reducers 移除所有 unsafe `as` cast | `reducers.ts` | action 參數改用 `AppAction` 型別，無需手動 cast |
| R5 | 狀態 | useIdiomChain 不再有 cross-setState 呼叫 | `useChainState.ts` | reducer 單次 dispatch 原子更新 board + charTiles + filledCount 等相關狀態 |
| R6 | 錯誤 | 新增 Error Boundary | `ErrorBoundary.tsx`, `main.tsx` | `main.tsx` 以 `<ErrorBoundary>` 包裹 `<App />`，render 錯誤不再白畫面 |
| R8 | 重複 | Fisher-Yates shuffle 統一實作 | `lib/utils.ts`, `levelGenerator.ts` | 移除 levelGenerator 內的 `shuffleArray`，改由 `lib/utils.ts` 匯入 `shuffle` |
| R9 | 重複 | TOGGLE_STARRED/TOGGLE_KNOWN 邏輯去重 | `reducers.ts` | 新增 `toggleListItem()` helper，兩處共用 |
| R10 | 結構 | levelGenerator 拆分為 generator + boardUtils | `levelGenerator.ts`, `boardUtils.ts` | 9 個純粹 board 工具函數移至 `boardUtils.ts`；levelGenerator 只留生成演算法 + re-export |
| R12 | 錯誤 | writeStoredValue 失敗時 console.error | `storage.ts` | 不再靜默吞錯誤，改用 `console.error` 記錄 |
| R13 | 錯誤 | readStoredValue 驗證存入資料 | `storage.ts` | 拒絕 null/非物件，只複製 fallback 中存在的 key，避免無效欄位 |
| R14 | 錯誤 | 空牌組不造成 NaN | `useIdiomApp.ts` | `idiomIds.length === 0` 時回傳 `null`，避免 modulo-by-zero |
| R15 | CSS | 佈局去重：新增 .page-shell 基底類別 | `index.css` | `.page-shell` 統一 min-height/max-width/margin/flex；`.app-shell` 和 `.game-shell` 只覆寫 padding |
| R16 | CSS | .game-page max-width 一致化 | `index.css`, `IdiomChainScreen.tsx`, `IdiomClozeScreen.tsx` | `.game-page` 不再自帶 max-width，改加 `.page-shell` 類別繼承統一 430px |
| R17 | 效能 | ChainBoardCell 包裝 React.memo | `ChainBoardCell.tsx` | 以 `memo()` 包裹元件，避免棋盤全格重繪 |
| R18 | 分離 | loadLevel 改用 requestAnimationFrame | `useChainState.ts` | 不再使用 `setTimeout` hack，改用 `requestAnimationFrame` |
| R19 | 死碼 | 移除 `updateWordStats` | `lib/utils.ts` | 此函式從未被呼叫，已刪除 |
| R20 | 死碼 | 移除泛型 `Action` 型別 | `actionTypes.ts` | 已由 `AppAction` discriminated union 取代 |
| R22 | 死碼 | 移除未使用 CSS 規則 | `index.css` | `.empty-hint`、`.section-header-btn`、`.summary-card.active` 已刪除 |
| R23 | 死碼 | useIdiomApp 不再回傳 idioms | `useIdiomApp.ts` | 消費者直接從 `idiomDb` 匯入 |
| R24 | 死碼 | 移除 Vite 預設素材 | `src/assets/` | `react.svg`、`vite.svg` 已刪除 |
| R25 | 命名 | lib/game.ts 改名為 lib/utils.ts | `lib/utils.ts` | 避免與 `game/` 目錄混淆；所有匯入路徑已更新 |
| R26 | 命名 | ChainPhase 型別移至 types/chain.ts | `types/chain.ts`, `useChainState.ts` | 獨立型別檔案，`useChainState` 及元件從此匯入 |
| R27 | 效能 | idioms.json 改為動態載入 | `idiomDb.ts` | `import('../data/idioms.json')` + `ready` promise；消費者 await `ready` 後再存取 |
| R28 | 效能 | idiomSentences.json 改為動態載入 | `useIdiomCloze.ts` | `import('../data/idiomSentences.json')` + `sentencesReady` promise |
| R29 | 狀態 | session 只持久化 screen | `useIdiomApp.ts` | `writeStoredValue(STORAGE_KEYS.session, { screen: session.screen })`；readSession 回傳 flashcards:null |
| R30 | 測試 | 新增固定 seed 的 50 關接龍測試頁 | `IdiomChainBatchTestScreen.tsx`, `levelGenerator.ts`, `utils.ts`, `HomeScreen.tsx`, `App.tsx` | 新增 `chain-test-fixed-v1` 批次頁；每關記錄 seed、成語與棋盤排列，方便回報特定關卡後可直接重現 debug |

---

## 成語接龍棋盤寬度調整指南

### 問題：cell overlap + 超出邊界

**根因**：舊版 `calcCellSize` 用 `Math.max(28, size)` 強制下限 28px，但當棋盤 cols/rows 過多時，28px 的格子總寬度會超出容器，CSS Grid 無法容納就造成 overlap 和超出邊界。例如 iPhone SE (375px) 上 12 欄 × 10 列：理想 cell size 是 26.9px，被 clamp 到 28px 後棋盤總寬 372px > 可用空間 359px，overflow 13px。

### 修正策略

1. **ChainBoard**：`calcCellSize` 不再 clamp，若 `raw < MIN_CELL` 則顯示「棋盤過大」提示（不渲染 overlap 棋盤）
2. **levelGenerator**：用最小 viewport（iPhone SE 375×667）做尺寸檢查，過大棋盤直接拒絕回傳 `null`，重新嘗試生成
3. 兩處使用同一組常數，確保計算一致

### CSS 間距常數

| 常數 | 值 | 來源 |
|------|-----|------|
| `GAME_PAD` | 8px | `.game-page` padding: 0 8px |
| `BOARD_BORDER` | 1px | `.board` border: 1px solid |
| `BOARD_PAD` | 6px | `.board` padding: 6px |
| `GAP` | 2px | `.board` gap: 2px |
| `MIN_CELL` | 28px | 最小可讀 cell 尺寸 |

### 動態 Cell Size 公式

```
containerW = min(viewportWidth, 430) - GAME_PAD * 2
containerH = viewportHeight * 0.55

innerW = containerW - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (cols - 1)
innerH = containerH - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (rows - 1)

cellSize = min(innerW / cols, innerH / rows)

if cellSize < 28 → tooSmall (顯示提示 / 生成器拒絕)
else → floor(cellSize) 即為實際 pixel 大小
```

### 生成時尺寸檢查（`levelGenerator.ts`）

使用最小 viewport（375×667, iPhone SE）計算，確保所有裝置都能容納：

- 若 `min(innerW / cols, innerH / rows) < 28` → 回傳 `null`
- 該次 `tryGenerateLevel` 失敗，重新嘗試（最多 100 次）

### 可通過檢查的棋盤尺寸（375×667 viewport）

| cols | rows | cellSize | 狀態 |
|------|------|----------|------|
| 8 | 8~11 | 30~41px | OK |
| 9 | 8~11 | 30~37px | OK |
| 10 | 8~11 | 30~33px | OK |
| 11 | 8~11 | 29.5px | OK (剛好過) |
| 12 | 任何 | ~26.9px | **拒絕** |
| 任何 | 12+ | <28px | **拒絕** |
