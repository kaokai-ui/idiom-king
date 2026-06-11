import openpyxl
import json

EXCEL_PATH = r'D:\Game\IdiomKing\中文字1.xlsx'
JSON_OUTPUT = r'D:\Game\IdiomKing\中文王\bopomofo_data.json'

wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
ws = wb.active

data = {}
for row in ws.iter_rows(min_row=2, values_only=True):
    no, char, bopomofo, definition, idiom, idiom_bopomofo, idiom_definition = row

    if char is None:
        continue

    entry = {
        "bopomofo": str(bopomofo).strip() if bopomofo else "",
        "definition": str(definition).strip() if definition else "",
        "idiom": str(idiom).strip() if idiom else "",
        "idiom_bopomofo": str(idiom_bopomofo).strip() if idiom_bopomofo else "",
        "idiom_definition": str(idiom_definition).strip() if idiom_definition else ""
    }

    data[str(char).strip()] = entry

with open(JSON_OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Done! Wrote {len(data)} entries to {JSON_OUTPUT}")
