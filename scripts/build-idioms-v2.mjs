import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.resolve(__dirname, '../idioms2.xlsx');
const idiomSentencesFile = path.resolve(__dirname, '../src/data/idiomSentences.json');
const outputDir = path.resolve(__dirname, '../public/data/idioms-v2');

const LEVEL_MAP = {
  '國小': 'elementary',
  '國中': 'junior',
  '高中以上': 'senior',
};

const LEVEL_LABELS = {
  elementary: '國小',
  junior: '國中',
  senior: '高中以上',
};

function parseIdioms2() {
  const wb = XLSX.readFile(inputFile);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const allIdioms = [];
  const seenByText = new Map();
  const duplicates = [];
  const invalidLevels = [];
  const elementarySentences = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const sourceNo = String(row[0] ?? '').trim();
    const text = String(row[1]).trim();
    const bopomofo = String(row[2] || '').trim();
    const usage = String(row[3] || '').trim();
    const levelLabel = String(row[4] || '').trim();
    const sentence = String(row[6] || '').trim();

    if (!text) continue;

    const level = LEVEL_MAP[levelLabel];
    if (!level) {
      invalidLevels.push({ row: i + 1, text, rawLevel: levelLabel });
      continue;
    }

    const dedupeKey = `${text}::${level}`;
    if (seenByText.has(dedupeKey)) {
      duplicates.push({ row: i + 1, text, level: levelLabel, kept: seenByText.get(dedupeKey) });
      continue;
    }

    const chars = text.split('');
    const uniqueChars = [...new Set(chars)];
    const charCountMap = {};
    for (const c of chars) {
      charCountMap[c] = (charCountMap[c] || 0) + 1;
    }

    const id = `idiom2_${sourceNo}`;

    const entry = {
      id,
      sourceNo,
      text,
      chars,
      uniqueChars,
      charCountMap,
      bopomofo,
      usage,
      level,
      levelLabel,
    };

    allIdioms.push(entry);
    seenByText.set(dedupeKey, sourceNo);

    if (level === 'elementary' && sentence) {
      const existing = elementarySentences.get(text);
      if (existing) {
        existing.push(sentence);
      } else {
        elementarySentences.set(text, [sentence]);
      }
    }
  }

  return { allIdioms, duplicates, invalidLevels, elementarySentences };
}

function buildLevelData(allIdioms) {
  const levels = { elementary: [], junior: [], senior: [] };

  for (const entry of allIdioms) {
    levels[entry.level].push(entry);
  }

  return levels;
}

function buildCharIndex(idiomList) {
  const idx = new Map();
  for (let i = 0; i < idiomList.length; i++) {
    const seen = new Set();
    for (const ch of idiomList[i].chars) {
      if (!seen.has(ch)) {
        seen.add(ch);
        let arr = idx.get(ch);
        if (!arr) { arr = []; idx.set(ch, arr); }
        arr.push(i);
      }
    }
  }
  return idx;
}

function buildClozeElementary(levelIdioms, elementarySentences) {
  const result = [];
  for (const idiom of levelIdioms) {
    const sentences = elementarySentences.get(idiom.text);
    if (sentences && sentences.length > 0) {
      result.push({ id: idiom.id, text: idiom.text, sentences });
    }
  }
  return result;
}

function buildClozeJunior(levelIdioms, elementaryIdioms, elementarySentences, idiomSentences) {
  const result = [];
  const seenIds = new Set();

  for (const idiom of elementaryIdioms) {
    const sentences = elementarySentences.get(idiom.text);
    if (sentences && sentences.length > 0) {
      result.push({ id: idiom.id, text: idiom.text, sentences });
      seenIds.add(idiom.id);
    }
  }

  for (const idiom of levelIdioms) {
    if (seenIds.has(idiom.id)) continue;
    const jsonSentences = idiomSentences[idiom.text];
    if (jsonSentences && jsonSentences.length > 0) {
      result.push({ id: idiom.id, text: idiom.text, sentences: jsonSentences });
      seenIds.add(idiom.id);
    }
  }

  return result;
}

function buildClozeSenior(levelIdioms, idiomSentences) {
  const result = [];
  for (const idiom of levelIdioms) {
    const sentences = idiomSentences[idiom.text];
    if (sentences && sentences.length > 0) {
      result.push({ id: idiom.id, text: idiom.text, sentences });
    }
  }
  return result;
}

function main() {
  console.log('=== Build idioms-v2 data ===\n');

  const { allIdioms, duplicates, invalidLevels, elementarySentences } = parseIdioms2();
  console.log(`Total parsed: ${allIdioms.length}`);

  const levelData = buildLevelData(allIdioms);
  const counts = {};
  for (const [key, idioms] of Object.entries(levelData)) {
    counts[key] = idioms.length;
    console.log(`  ${LEVEL_LABELS[key]}: ${idioms.length}`);
  }

  if (duplicates.length > 0) {
    console.log(`\nDuplicates (${duplicates.length}):`);
    for (const d of duplicates.slice(0, 10)) {
      console.log(`  Row ${d.row}: "${d.text}" (${d.level}), kept sourceNo ${d.kept}`);
    }
    if (duplicates.length > 10) console.log(`  ... and ${duplicates.length - 10} more`);
  }

  if (invalidLevels.length > 0) {
    console.log(`\nInvalid levels (${invalidLevels.length}):`);
    for (const inv of invalidLevels.slice(0, 10)) {
      console.log(`  Row ${inv.row}: "${inv.text}" has level "${inv.rawLevel}"`);
    }
  }

  let idiomSentences = {};
  try {
    const raw = fs.readFileSync(idiomSentencesFile, 'utf-8');
    idiomSentences = JSON.parse(raw);
    console.log(`\nLoaded idiomSentences.json: ${Object.keys(idiomSentences).length} idioms with sentences`);
  } catch {
    console.log('\nWarning: could not load idiomSentences.json, cloze intersection will be empty');
  }

  const catalog = {
    levels: Object.entries(counts).map(([key, count]) => ({
      key,
      label: LEVEL_LABELS[key],
      count,
      file: `levels/${key}/chunk-001.json`,
    })),
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(`${outputDir}/levels/elementary`, { recursive: true });
  fs.mkdirSync(`${outputDir}/levels/junior`, { recursive: true });
  fs.mkdirSync(`${outputDir}/levels/senior`, { recursive: true });
  fs.mkdirSync(`${outputDir}/cloze`, { recursive: true });

  fs.writeFileSync(`${outputDir}/catalog.json`, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`\nWrote catalog.json`);

  for (const [level, idioms] of Object.entries(levelData)) {
    const chunkData = idioms.map(({ id, sourceNo, text, chars, uniqueChars, charCountMap, bopomofo, usage, level: lvl, levelLabel }) => ({
      id, sourceNo, text, chars, uniqueChars, charCountMap, bopomofo, usage, level: lvl, levelLabel,
    }));
    const chunkFile = `${outputDir}/levels/${level}/chunk-001.json`;
    fs.writeFileSync(chunkFile, JSON.stringify(chunkData, null, 2), 'utf-8');
    console.log(`Wrote ${level}/chunk-001.json (${chunkData.length} entries)`);

    const charIdx = buildCharIndex(idioms);
    const charIndexObj = {};
    for (const [ch, indices] of charIdx.entries()) {
      charIndexObj[ch] = indices;
    }
    fs.writeFileSync(`${outputDir}/levels/${level}/charIndex.json`, JSON.stringify(charIndexObj, null, 2), 'utf-8');
    console.log(`Wrote ${level}/charIndex.json`);

    let clozeData;
    if (level === 'elementary') {
      clozeData = buildClozeElementary(idioms, elementarySentences);
    } else if (level === 'junior') {
      clozeData = buildClozeJunior(idioms, levelData.elementary, elementarySentences, idiomSentences);
    } else {
      clozeData = buildClozeSenior(idioms, idiomSentences);
    }
    fs.writeFileSync(`${outputDir}/cloze/${level}.json`, JSON.stringify(clozeData, null, 2), 'utf-8');
    console.log(`Wrote cloze/${level}.json (${clozeData.length} idioms with sentences)`);
  }

  const allIdiomsJson = allIdioms.map(({ id, sourceNo, text, chars, uniqueChars, charCountMap, bopomofo, usage, level, levelLabel }) => ({
    id, sourceNo, text, chars, uniqueChars, charCountMap, bopomofo, usage, level, levelLabel,
  }));
  const srcDataDir = path.resolve(__dirname, '../src/data');
  fs.mkdirSync(srcDataDir, { recursive: true });
  fs.writeFileSync(`${srcDataDir}/idiomsV2.json`, JSON.stringify(allIdiomsJson, null, 2), 'utf-8');
  console.log(`\nWrote src/data/idiomsV2.json (${allIdiomsJson.length} entries)`);

  console.log('\n=== Build report ===');
  console.log(`Total idioms: ${allIdioms.length}`);
  for (const [key, count] of Object.entries(counts)) {
    console.log(`  ${LEVEL_LABELS[key]}: ${count}`);
  }
  console.log(`Duplicates: ${duplicates.length}`);
  console.log(`Invalid levels: ${invalidLevels.length}`);
  for (const level of ['elementary', 'junior', 'senior']) {
    let cloze;
    if (level === 'elementary') {
      cloze = buildClozeElementary(levelData[level], elementarySentences);
    } else if (level === 'junior') {
      cloze = buildClozeJunior(levelData[level], levelData.elementary, elementarySentences, idiomSentences);
    } else {
      cloze = buildClozeSenior(levelData[level], idiomSentences);
    }
    console.log(`Cloze ${LEVEL_LABELS[level]}: ${cloze.length} available`);
  }

  console.log('\nDone!');
}

main();
