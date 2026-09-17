#!/usr/bin/env python3
"""Extract mess menu dates and meals from the workbook's first worksheet."""
import base64
import io
import json
import re
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

N = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
     'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
MEALS = ('Breakfast', 'Lunch', 'Evening Snacks', 'Dinner')


def cell_column(address):
    result = 0
    for letter in re.match(r'[A-Z]+', address).group():
        result = result * 26 + ord(letter) - ord('A') + 1
    return result - 1


def clean(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def read_rows(source):
    raw = source.read_bytes()
    if not raw.startswith(b'PK'):
        try:
            raw = base64.b64decode(b''.join(raw.split()), validate=True)
        except Exception as exc:
            raise ValueError('Menu source is not a valid XLSX file') from exc
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        broken = archive.testzip()
        if broken:
            raise ValueError(f'Corrupted Excel archive member: {broken}')
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(t.text or '' for t in si.findall('.//m:t', N))
                       for si in root.findall('m:si', N)]
        book = ET.fromstring(archive.read('xl/workbook.xml'))
        first = book.find('m:sheets/m:sheet', N)
        if first is None:
            raise ValueError('Workbook has no worksheet')
        relationship_id = first.attrib[f'{{{N["r"]}}}id']
        rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        target = next((r.attrib['Target'] for r in rels
                       if r.attrib.get('Id') == relationship_id), None)
        if target is None:
            raise ValueError('Worksheet relationship was not found')
        # Excel may use /xl/worksheets/sheet1.xml or worksheets/sheet1.xml.
        path = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        root = ET.fromstring(archive.read(path))
        rows = {}
        for row in root.findall('.//m:sheetData/m:row', N):
            cells = {}
            for cell in row.findall('m:c', N):
                col = cell_column(cell.attrib['r'])
                kind = cell.attrib.get('t')
                v = cell.find('m:v', N)
                if kind == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.findall('.//m:t', N))
                elif v is None:
                    value = ''
                elif kind == 's':
                    value = strings[int(v.text)]
                else:
                    value = v.text or ''
                cells[col] = value
            rows[int(row.attrib['r'])] = cells
    return rows


def excel_date(value):
    if value is None or value == '':
        raise ValueError('Empty date')
    try:
        return (datetime(1899, 12, 30) + timedelta(days=float(value))).date().isoformat()
    except (TypeError, ValueError):
        pass
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y'):
        try:
            return datetime.strptime(str(value).strip(), fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f'Unrecognised date: {value!r}')


def convert(source, output):
    rows = read_rows(source)
    first_row = rows.get(1, {})
    dates = []
    for col, value in sorted(first_row.items()):
        if col < 2 or not value:
            continue
        try:
            dates.append((col, excel_date(value)))
        except ValueError:
            continue
    if not dates or len({date for _, date in dates}) != len(dates):
        raise ValueError('No menu dates or duplicate dates found in row 1')
    starts = [(number, clean(cells.get(0))) for number, cells in sorted(rows.items())
              if clean(cells.get(0)) in MEALS]
    if [meal for _, meal in starts] != list(MEALS):
        raise ValueError(f'Unexpected meal sections: {starts}')
    result = [{'date': date, 'meals': {}} for _, date in dates]
    for j, (start, meal) in enumerate(starts):
        end = starts[j + 1][0] if j + 1 < len(starts) else max(rows) + 1
        for day, (col, _) in zip(result, dates):
            entries = []
            category = ''
            for number in range(start, end):
                values = rows.get(number, {})
                if clean(values.get(1)):
                    category = clean(values[1])
                item = clean(values.get(col))
                if item and item.casefold() != 'item':
                    entries.append([category or 'Additional', item])
            day['meals'][meal] = entries
    if not all(all(day['meals'][m] for m in MEALS) for day in result):
        raise ValueError('At least one menu date contains an empty meal section')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Converted {len(result)} dates from {result[0]["date"]} to {result[-1]["date"]}')


if __name__ == '__main__':
    convert(Path(sys.argv[1] if len(sys.argv) > 1 else 'source/menu.xlsx'),
            Path(sys.argv[2] if len(sys.argv) > 2 else 'data/menu.json'))
