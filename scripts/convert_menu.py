#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import json
import re
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

MEALS = ["Breakfast", "Lunch", "Evening Snacks", "Dinner"]


def col_index(cell_ref: str) -> int:
    match = re.match(r"([A-Z]+)", cell_ref)
    letters = match.group(1)
    value = 0
    for char in letters:
        value = value * 26 + (ord(char) - 64)
    return value - 1


def excel_date(value):
    if isinstance(value, (int, float)):
        return (datetime(1899, 12, 30) + timedelta(days=float(value))).date().isoformat()

    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f"Could not parse date value: {value!r}")


def workbook_bytes(path: Path) -> bytes:
    raw = path.read_bytes()

    # Normal Git/GitHub uploads are real XLSX ZIP files and start with PK.
    if raw.startswith(b"PK"):
        return raw

    # Chat/connector uploads may arrive as base64 text. Support that too.
    try:
        decoded = base64.b64decode(b"".join(raw.split()), validate=True)
    except Exception as exc:
        raise RuntimeError(
            "source/menu.xlsx is neither a valid XLSX file nor a base64-encoded XLSX file"
        ) from exc

    if not decoded.startswith(b"PK"):
        raise RuntimeError("Decoded source/menu.xlsx is not a valid XLSX file")

    return decoded


def read_first_sheet(path: Path):
    data = workbook_bytes(path)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS):
                shared_strings.append(
                    "".join(node.text or "" for node in item.iterfind(".//m:t", NS))
                )

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        first_sheet = workbook.find("m:sheets/m:sheet", NS)
        rel_id = first_sheet.attrib[f"{{{NS['r']}}}id"]

        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = None
        for rel in rels:
            if rel.attrib.get("Id") == rel_id:
                target = rel.attrib["Target"]
                break
        if not target:
            raise RuntimeError("Could not locate the first worksheet.")

        sheet_path = "xl/" + target.lstrip("/")
        root = ET.fromstring(archive.read(sheet_path))

        rows = {}
        max_col = 0
        for row in root.findall(".//m:sheetData/m:row", NS):
            row_num = int(row.attrib["r"])
            row_values = {}
            for cell in row.findall("m:c", NS):
                ref = cell.attrib["r"]
                col = col_index(ref)
                max_col = max(max_col, col)
                cell_type = cell.attrib.get("t")
                value_node = cell.find("m:v", NS)

                if cell_type == "inlineStr":
                    inline = cell.find("m:is", NS)
                    value = (
                        "".join(node.text or "" for node in inline.iterfind(".//m:t", NS))
                        if inline is not None
                        else ""
                    )
                elif value_node is None:
                    value = ""
                elif cell_type == "s":
                    value = shared_strings[int(value_node.text)]
                else:
                    raw = value_node.text or ""
                    try:
                        value = float(raw)
                        if value.is_integer():
                            value = int(value)
                    except ValueError:
                        value = raw

                row_values[col] = value
            rows[row_num] = row_values

        return rows, max_col


def clean(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def convert(source: Path, output: Path):
    rows, max_col = read_first_sheet(source)

    date_columns = []
    for col in range(2, max_col + 1):
        value = rows.get(1, {}).get(col, "")
        if value == "":
            continue
        try:
            date_columns.append((col, excel_date(value)))
        except Exception:
            continue

    if not date_columns:
        raise RuntimeError(
            "No menu dates found. Expected dates in row 1 from column C onward."
        )

    meal_starts = []
    for row_num in sorted(rows):
        label = clean(rows[row_num].get(0, ""))
        if label in MEALS:
            meal_starts.append((row_num, label))

    found_meals = [meal for _, meal in meal_starts]
    if found_meals != MEALS:
        raise RuntimeError(f"Expected meal sections {MEALS}; found {found_meals}")

    result = [{"date": date, "meals": {}} for _, date in date_columns]

    for meal_index, (start_row, meal) in enumerate(meal_starts):
        end_row = (
            meal_starts[meal_index + 1][0] - 1
            if meal_index + 1 < len(meal_starts)
            else max(rows)
        )

        for day_index, (col, _) in enumerate(date_columns):
            entries = []
            last_category = ""

            for row_num in range(start_row, end_row + 1):
                category = clean(rows.get(row_num, {}).get(1, ""))
                item = clean(rows.get(row_num, {}).get(col, ""))

                if category:
                    last_category = category
                if not item or item.lower() == "item":
                    continue

                label = category or (
                    f"{last_category} (cont.)" if last_category else "Additional"
                )
                entries.append([label, item])

            result[day_index]["meals"][meal] = entries

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(
        f"Generated {output} with {len(result)} dates: "
        f"{result[0]['date']} -> {result[-1]['date']}"
    )


if __name__ == "__main__":
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "source/menu.xlsx")
    output = Path(sys.argv[2] if len(sys.argv) > 2 else "data/menu.json")
    convert(source, output)
