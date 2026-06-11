import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.resolve(__dirname, '../../idiom.txt');
const outputFile = path.resolve(__dirname, '../src/data/idioms.json');

const raw = fs.readFileSync(inputFile, 'utf-8');
const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

const idioms = [];
const seen = new Set();

for (const line of lines) {
  const text = line.trim();
  if (text.length !== 4) continue;
  if (seen.has(text)) continue;
  seen.add(text);

  const chars = text.split('');
  const charCountMap = {};
  const uniqueChars = [...new Set(chars)];
  for (const c of chars) {
    charCountMap[c] = (charCountMap[c] || 0) + 1;
  }

  idioms.push({
    id: `idiom_${String(idioms.length + 1).padStart(4, '0')}`,
    text,
    chars,
    uniqueChars,
    charCountMap,
  });
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(idioms, null, 2), 'utf-8');
console.log(`Parsed ${idioms.length} idioms to ${outputFile}`);
