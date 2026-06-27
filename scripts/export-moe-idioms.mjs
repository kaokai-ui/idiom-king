import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://dict.idioms.moe.edu.tw";
const REVISED_BASE_URL = "https://dict.revised.moe.edu.tw";
const CONCISED_BASE_URL = "https://dict.concised.moe.edu.tw";

const DEFAULT_INPUT = path.resolve(__dirname, "../newidioms.txt");
const THREAD_ID = process.env.CODEX_THREAD_ID || "manual";
const DEFAULT_OUTPUT = path.resolve(
  __dirname,
  `../outputs/${THREAD_ID}/moe-idioms.xlsx`,
);
const DEFAULT_PREVIEW = path.resolve(
  __dirname,
  `../outputs/${THREAD_ID}/moe-idioms-preview.png`,
);

const CONCURRENCY = 6;
const RETRY_LIMIT = 3;

const inputPath = path.resolve(process.argv[2] || DEFAULT_INPUT);
const outputPath = path.resolve(process.argv[3] || DEFAULT_OUTPUT);
const outputDir = path.dirname(outputPath);
const previewPath =
  process.argv[3] || outputPath !== DEFAULT_OUTPUT
    ? path.join(outputDir, `${path.parse(outputPath).name}-preview.png`)
    : DEFAULT_PREVIEW;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/1.0 Safari/537.36";

const SITE_CONFIGS = {
  idioms: {
    baseUrl: BASE_URL,
    searchUrl: `${BASE_URL}/search.jsp`,
    defaultReferer: `${BASE_URL}/search.jsp`,
  },
  revised: {
    baseUrl: REVISED_BASE_URL,
    searchUrl: `${REVISED_BASE_URL}/search.jsp?md=1`,
    defaultReferer: `${REVISED_BASE_URL}/search.jsp?md=1`,
  },
  concised: {
    baseUrl: CONCISED_BASE_URL,
    searchUrl: `${CONCISED_BASE_URL}/search.jsp`,
    defaultReferer: `${CONCISED_BASE_URL}/search.jsp`,
  },
};

const sessionCookies = new Map();

const NOT_FOUND = "未找到";

const MANUAL_REVISED_LOOKUPS = {
  水磨功夫: { id: "134153", matchedLabel: "水磨工夫", mode: "regular" },
  迴腸盪氣: { id: "85174", matchedLabel: "迴腸蕩氣", mode: "regular" },
  清心寡欲: { id: "102249", matchedLabel: "清心寡慾", mode: "regular" },
  "挂╱掛一漏萬": { id: "71928", matchedLabel: "掛一漏萬", mode: "regular" },
  "老生常談╱譚": { id: "60472", matchedLabel: "老生常談", mode: "regular" },
  "善罷甘╱干休": { id: "130944", matchedLabel: "善罷甘休", mode: "regular" },
  "駑馬十駕╱舍": { id: "58404", matchedLabel: "駑馬十駕", mode: "regular" },
  随遇而安: { id: "145867", matchedLabel: "隨遇而安", mode: "regular" },
  别開生面: { id: "18324", matchedLabel: "別開生面", mode: "regular" },
  "負隅╱嵎頑抗": { id: "39299", matchedLabel: "負隅頑抗", mode: "regular" },
  養家餬口: { id: "157744", matchedLabel: "養家活口", mode: "regular" },
  光陰如箭: { id: "74570", matchedLabel: "光陰似箭", mode: "non_regular" },
  出奇不意: { id: "124901", matchedLabel: "出其不意", mode: "non_regular" },
  味美價廉: { id: "159895", matchedLabel: "物美價廉", mode: "non_regular" },
  無心插柳: {
    id: "159184",
    matchedLabel: "無心插柳柳成蔭",
    mode: "non_regular",
  },
  貧賤不移: { id: "25533", matchedLabel: "貧賤不能移", mode: "non_regular" },
  急功好利: { id: "88128", matchedLabel: "急功近利", mode: "non_regular" },
};

const DIRECT_URL_OVERRIDES = {
  販夫走卒: {
    site: "concised",
    url: "https://dict.concised.moe.edu.tw/dictView.jsp?ID=5686&la=0&powerMode=0",
  },
  珍羞異饌: {
    site: "revised",
    url: "https://dict.revised.moe.edu.tw/dictView.jsp?ID=116325&la=0&powerMode=0",
  },
  坐立不安: {
    site: "idioms",
    url: "https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=-1469&webMd=1&la=0",
  },
  絃歌不輟: {
    site: "revised",
    url: "https://dict.revised.moe.edu.tw/dictView.jsp?ID=107933&la=0&powerMode=0",
  },
  貴客盈門: {
    site: "idioms",
    url: "https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=13611&webMd=2&la=0",
  },
  松柏長青: {
    site: "revised",
    url: "https://dict.revised.moe.edu.tw/dictView.jsp?ID=146193&la=0&powerMode=0",
  },
  能言善道: {
    site: "revised",
    url: "https://dict.revised.moe.edu.tw/dictView.jsp?ID=57284&la=0&powerMode=0",
  },
};

function decodeHtmlEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return text.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (match, entity) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const code = Number.parseInt(entity.slice(2), 16);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      if (entity.startsWith("#")) {
        const code = Number.parseInt(entity.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return named[entity] ?? match;
    },
  );
}

function stripTags(html) {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/\u3000/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function normalizeLabel(label) {
  return label.replace(/[\s：:]/g, "");
}

function createNotFoundResult(idiom) {
  return {
    term: idiom,
    bopomofo: NOT_FOUND,
    pinyin: NOT_FOUND,
    definition: NOT_FOUND,
    found: false,
  };
}

async function ensureSiteSession(siteKey) {
  if (sessionCookies.has(siteKey)) {
    return sessionCookies.get(siteKey);
  }

  const site = SITE_CONFIGS[siteKey];
  const response = await fetch(site.searchUrl, {
    headers: {
      "user-agent": USER_AGENT,
      referer: site.defaultReferer,
    },
  });

  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
  sessionCookies.set(siteKey, cookie);
  return cookie;
}

async function fetchText(url, { siteKey, referer, retryCount = RETRY_LIMIT } = {}) {
  const resolvedSiteKey =
    siteKey ??
    Object.entries(SITE_CONFIGS).find(([, site]) => url.startsWith(site.baseUrl))?.[0];

  if (!resolvedSiteKey) {
    throw new Error(`Unknown site for URL: ${url}`);
  }

  const site = SITE_CONFIGS[resolvedSiteKey];

  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    const cookie = await ensureSiteSession(resolvedSiteKey);
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        referer: referer ?? site.defaultReferer,
        ...(cookie ? { cookie } : {}),
      },
    });

    const nextCookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    if (nextCookie) {
      sessionCookies.set(resolvedSiteKey, nextCookie);
    }

    const text = await response.text();
    if (response.ok && text.length > 0) {
      return text;
    }

    sessionCookies.delete(resolvedSiteKey);
    if (attempt === retryCount) {
      throw new Error(
        `Failed to fetch ${url} (status=${response.status}, bodyLength=${text.length})`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }

  throw new Error(`Failed to fetch ${url}`);
}

function parseMetaDescriptionFieldMap(html) {
  const metaMatch = html.match(
    /<meta[^>]+name=["']Description["'][^>]+content=["']([\s\S]*?)["'][^>]*\/?>/i,
  );
  if (!metaMatch) {
    return null;
  }

  const content = decodeHtmlEntities(metaMatch[1]).trim();
  if (!content) {
    return null;
  }

  const fieldMap = new Map();
  const labelRegex = /(字詞|字詞名|詞語|成語|注音|漢語拼音|釋義)\s*:\s*/g;
  const labels = [...content.matchAll(labelRegex)];

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index][1];
    const valueStart = labels[index].index + labels[index][0].length;
    const valueEnd = index + 1 < labels.length ? labels[index + 1].index : content.length;
    const value = content
      .slice(valueStart, valueEnd)
      .replace(/^[,，\s]+|[,，\s]+$/g, "")
      .trim();

    if (value) {
      fieldMap.set(normalizeLabel(label), value);
    }
  }

  return fieldMap.size > 0 ? fieldMap : null;
}

function parseDetailFieldMap(html) {
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];

  for (const tableMatch of tables) {
    const fieldMap = new Map();

    for (const rowMatch of tableMatch[1].matchAll(
      /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi,
    )) {
      const label = normalizeLabel(stripTags(rowMatch[1]));
      const value = stripTags(rowMatch[2]);
      if (label) {
        fieldMap.set(label, value);
      }
    }

    if (fieldMap.size === 0) {
      continue;
    }

    const hasTermField = ["詞語", "字詞名", "詞目", "條目", "詞條"].some((label) =>
      fieldMap.has(label),
    );
    const hasDefinitionField = ["釋義", "解釋"].some((label) => fieldMap.has(label));

    if (hasTermField || hasDefinitionField) {
      return fieldMap;
    }
  }

  const metaFieldMap = parseMetaDescriptionFieldMap(html);
  if (metaFieldMap) {
    return metaFieldMap;
  }

  throw new Error("Unable to locate a dictionary detail table.");
}

function buildFoundResult(requestedTerm, fieldMap, options = {}) {
  const sourceTerm =
    fieldMap.get("詞語") ??
    fieldMap.get("字詞名") ??
    fieldMap.get("詞目") ??
    fieldMap.get("條目") ??
    fieldMap.get("詞條") ??
    requestedTerm;

  let definition = fieldMap.get("釋義") ?? fieldMap.get("解釋") ?? "";
  if (options.nonRegularLabel) {
    definition = `【非正規對應：${options.nonRegularLabel}】${definition}`;
  }

  return {
    term: options.keepRequestedTerm === false ? sourceTerm : requestedTerm,
    bopomofo: fieldMap.get("注音") ?? "",
    pinyin: fieldMap.get("漢語拼音") ?? "",
    definition,
    found: true,
  };
}

function parseSearchResult(html, idiom) {
  const rowRegex =
    /<tr[^>]*goMean\((-?\d+),\s*event,\s*1\)[^>]*>[\s\S]*?<a href='idiomView\.jsp\?ID=(-?\d+)[^']*'>([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi;

  for (const match of html.matchAll(rowRegex)) {
    const idiomId = match[1];
    const anchorId = match[2];
    const label = stripTags(match[3]);

    if (label === idiom && idiomId === anchorId) {
      return { idiomId };
    }
  }

  return null;
}

async function fetchIdiomData(idiom) {
  const params = new URLSearchParams({
    idiom,
    qMd: "0",
    qTp: "1",
  });
  params.append("qTp", "2");

  const listHtml = await fetchText(`${BASE_URL}/idiomList.jsp?${params.toString()}`, {
    siteKey: "idioms",
  });
  const match = parseSearchResult(listHtml, idiom);
  if (!match) {
    return createNotFoundResult(idiom);
  }

  const detailHtml = await fetchText(`${BASE_URL}/idiomView.jsp?ID=${match.idiomId}&q=1`, {
    siteKey: "idioms",
    referer: `${BASE_URL}/idiomList.jsp?${params.toString()}`,
  });

  return buildFoundResult(idiom, parseDetailFieldMap(detailHtml));
}

function parseRevisedResultRow(html, idiom) {
  const rowRegex =
    /<tr[^>]+data-link='dictView\.jsp\?ID=(\d+)[^']*'[^>]*>[\s\S]*?<a href="dictView\.jsp\?ID=\d+[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi;

  for (const match of html.matchAll(rowRegex)) {
    const label = stripTags(match[2]);
    if (label === idiom) {
      return { id: match[1] };
    }
  }

  return null;
}

async function fetchRevisedData(idiom) {
  const searchUrl = `${REVISED_BASE_URL}/search.jsp?md=1&word=${encodeURIComponent(idiom)}`;
  const searchHtml = await fetchText(searchUrl, {
    siteKey: "revised",
    referer: SITE_CONFIGS.revised.defaultReferer,
  });

  if (searchHtml.includes("dictView.jsp?ID=") && searchHtml.includes("<article")) {
    return buildFoundResult(idiom, parseDetailFieldMap(searchHtml));
  }

  const result = parseRevisedResultRow(searchHtml, idiom);
  if (!result) {
    return null;
  }

  const detailUrl = `${REVISED_BASE_URL}/dictView.jsp?ID=${result.id}&q=1&word=${encodeURIComponent(idiom)}`;
  const detailHtml = await fetchText(detailUrl, {
    siteKey: "revised",
    referer: searchUrl,
  });

  return buildFoundResult(idiom, parseDetailFieldMap(detailHtml));
}

async function fetchRevisedById(idiom, lookup) {
  const detailUrl = `${REVISED_BASE_URL}/dictView.jsp?ID=${lookup.id}&la=0&powerMode=0`;
  const detailHtml = await fetchText(detailUrl, {
    siteKey: "revised",
    referer: SITE_CONFIGS.revised.defaultReferer,
  });

  return buildFoundResult(idiom, parseDetailFieldMap(detailHtml), {
    nonRegularLabel: lookup.mode === "non_regular" ? lookup.matchedLabel : undefined,
  });
}

async function fetchDirectUrlOverride(idiom, override) {
  const detailHtml = await fetchText(override.url, {
    siteKey: override.site,
    referer: SITE_CONFIGS[override.site].defaultReferer,
  });

  return buildFoundResult(idiom, parseDetailFieldMap(detailHtml));
}

async function fetchIdiomWithFallback(idiom) {
  const directOverride = DIRECT_URL_OVERRIDES[idiom];
  if (directOverride) {
    return fetchDirectUrlOverride(idiom, directOverride);
  }

  const primary = await fetchIdiomData(idiom);
  if (primary.found) {
    return primary;
  }

  const manualLookup = MANUAL_REVISED_LOOKUPS[idiom];
  if (manualLookup) {
    const manualResult = await fetchRevisedById(idiom, manualLookup);
    if (manualResult) {
      return manualResult;
    }
  }

  const revised = await fetchRevisedData(idiom);
  if (revised) {
    return revised;
  }

  return primary;
}

async function mapWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return results;
}

function parseInputIdioms(rawText) {
  const idioms = [];
  let quotedBuffer = null;

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (quotedBuffer !== null) {
      quotedBuffer += line;
      if (line.endsWith('"')) {
        idioms.push(quotedBuffer.replace(/^"+|"+$/g, "").trim());
        quotedBuffer = null;
      }
      continue;
    }

    if (line.startsWith('"') && !line.endsWith('"')) {
      quotedBuffer = line;
      continue;
    }

    idioms.push(line.replace(/^"+|"+$/g, "").trim());
  }

  if (quotedBuffer !== null) {
    idioms.push(quotedBuffer.replace(/^"+|"+$/g, "").trim());
  }

  return idioms;
}

async function buildWorkbook(rows) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("成語資料");
  sheet.showGridLines = false;

  const values = [
    ["詞語", "注音", "漢語拼音", "釋義"],
    ...rows.map((row) => [row.term, row.bopomofo, row.pinyin, row.definition]),
  ];

  const endRow = values.length;
  sheet.getRange(`A1:D${endRow}`).values = values;
  sheet.freezePanes.freezeRows(1);

  sheet.getRange(`A1:D${endRow}`).format = {
    font: { name: "Noto Sans TC" },
  };
  sheet.getRange("A1:D1").format = {
    fill: "#3C6E71",
    font: { name: "Noto Sans TC", bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:C${endRow}`).format = {
    verticalAlignment: "top",
  };
  sheet.getRange(`D2:D${endRow}`).format = {
    verticalAlignment: "top",
    wrapText: true,
  };
  sheet.getRange(`A1:D${endRow}`).format.borders = {
    preset: "all",
    style: "thin",
    color: "#D7DEE2",
  };

  sheet.getRange("A:A").format.columnWidth = 18;
  sheet.getRange("B:B").format.columnWidth = 22;
  sheet.getRange("C:C").format.columnWidth = 24;
  sheet.getRange("D:D").format.columnWidth = 68;
  sheet.getRange("1:1").format.rowHeight = 24;
  sheet.getRange(`A2:D${endRow}`).format.autofitRows();

  return workbook;
}

async function verifyWorkbook(workbook, rowCount) {
  const lastRow = Math.min(rowCount + 1, 15);
  const inspectResult = await workbook.inspect({
    kind: "table",
    range: `成語資料!A1:D${lastRow}`,
    include: "values",
    tableMaxRows: lastRow,
    tableMaxCols: 4,
  });
  console.log(inspectResult.ndjson);

  await fs.mkdir(path.dirname(previewPath), { recursive: true });
  const preview = await workbook.render({
    sheetName: "成語資料",
    range: `A1:D${lastRow}`,
    scale: 1.5,
    format: "png",
  });
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
}

async function main() {
  const raw = await fs.readFile(inputPath, "utf8");
  const idioms = parseInputIdioms(raw);

  if (idioms.length === 0) {
    throw new Error("Input file does not contain any idioms.");
  }

  console.log(`讀取 ${idioms.length} 筆成語，去重後 ${new Set(idioms).size} 筆。`);

  const rows = await mapWithConcurrency(
    idioms,
    async (idiom, index) => {
      const result = await fetchIdiomWithFallback(idiom);
      console.log(
        `[${index + 1}/${idioms.length}] ${idiom} -> ${result.found ? "找到" : "未找到"}`,
      );
      return result;
    },
    CONCURRENCY,
  );

  const workbook = await buildWorkbook(rows);
  await verifyWorkbook(workbook, rows.length);

  await fs.mkdir(outputDir, { recursive: true });
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(outputPath);

  const foundCount = rows.filter((row) => row.found).length;
  console.log(`輸出完成: ${outputPath}`);
  console.log(`找到 ${foundCount} 筆，未找到 ${rows.length - foundCount} 筆。`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
