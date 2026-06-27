# 我是成語王 / 我是成語王2

這個專案是用 `Vite + React + TypeScript` 製作的成語學習遊戲，目前同時保留：

- `index.html`：我是成語王（1 代）
- `idiom2.html`：我是成語王2（2 代）

## 本地開發

```bash
npm install
npm run dev
```

本地入口：

- 1 代：`http://127.0.0.1:4173/idiom-king/`
- 2 代：`http://127.0.0.1:4173/idiom-king/idiom2.html`

## 常用指令

```bash
npm run dev
npm run build
npm run test
npm run preview
```

## 我是成語王2 重點

- 2 代使用 `idioms2.xlsx` 作為主要資料來源
- 2 代支援 `國小 / 國中 / 高中以上`
- 2 代入口與 1 代入口分離，避免互相干擾
- 2 代的 localStorage key 使用 `idiom-king-2:*`
- 2 代資料輸出位於 `public/data/idioms-v2/`

## 發佈前檢查

```bash
npm run build
npm run test
```

建議確認：

- `index.html` 可正常開啟 1 代
- `idiom2.html` 可正常開啟 2 代
- 2 代首頁可切換等級
- `成語接龍（隨機模式）`、`成語接龍（不分程度挑戰模式）`、`成語填空` 可正常進入

## 專案備註

- `BUG.md`、`DEV.md`、`IDIOM_KING_2_REVAMP_PLAN.md` 是本地工作文件，目前不納入 git
- `outputs/`、`tmp_revised_test.txt` 為本地產物，已忽略
