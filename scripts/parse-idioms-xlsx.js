import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.resolve(__dirname, '../../idioms.xlsx');
const outputFile = path.resolve(__dirname, '../src/data/idioms.json');

const wb = XLSX.readFile(inputFile);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const idioms = [];
const seen = new Set();

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[1]) continue;

  const id = row[0];
  const text = String(row[1]).trim();
  const bopomofo = String(row[2] || '').trim();
  const usage = String(row[3] || '').trim();
  const definition = String(row[4] || '').trim();

  if (!text || text.length < 4) continue;
  if (seen.has(text)) continue;
  seen.add(text);

  const chars = text.split('');
  const uniqueChars = [...new Set(chars)];
  const charCountMap = {};
  for (const c of chars) {
    charCountMap[c] = (charCountMap[c] || 0) + 1;
  }

  idioms.push({
    id: `idiom_${String(id).padStart(4, '0')}`,
    text,
    chars,
    uniqueChars,
    charCountMap,
    bopomofo,
    usage,
    definition,
  });
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(idioms, null, 2), 'utf-8');
console.log(`Parsed ${idioms.length} idioms to ${outputFile}`);
