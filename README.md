# Mess Menu

A lightweight GitHub Pages web app for viewing the SEDC mess menu.

## Updating the menu

### Quick way: `make update`

1. Put the new Excel file (any name, e.g. `November 16-30th Menu.xlsx`) in the repository root. It must be the only `.xlsx` file there.
2. Run:

   ```sh
   make update
   ```

This will:

1. move the file to `source/menu.xlsx` (replacing the old one),
2. run `scripts/convert_menu.py` to regenerate `data/menu.json` locally, so a broken spreadsheet fails on your machine,
3. commit `source/menu.xlsx` and `data/menu.json`,
4. push to `master`, which triggers the deploy.

`make update` stops with a message if there is no `.xlsx` file or more than one.

### Manual way

Replace `source/menu.xlsx` (keep the filename exactly `menu.xlsx`) and commit it to the `master` branch.

### What happens after a push

GitHub Actions automatically:

1. reads the Excel workbook,
2. regenerates `data/menu.json`,
3. validates the generated menu (no duplicate dates, all four meals present for every day),
4. deploys the updated site to GitHub Pages.

You do not need to edit `app.js`, `index.html`, or `data/menu.json` manually.

## Spreadsheet layout

The converter expects the same general layout as the current SEDC menu: dates across row 1, meal section names in column A, and item/category labels in column B. Different dates are detected automatically.

Each day must contain the four meals `Breakfast`, `Lunch`, `Evening Snacks` and `Dinner`.

To check a spreadsheet without committing anything:

```sh
python3 scripts/convert_menu.py "path/to/menu.xlsx" /tmp/menu.json
```

## Project layout

| Path | Purpose |
| --- | --- |
| `source/menu.xlsx` | Source of truth for the menu |
| `data/menu.json` | Generated from the Excel file |
| `scripts/convert_menu.py` | Excel to JSON converter |
| `index.html`, `app.js`, `styles.css` | The web app |
| `sw.js`, `manifest.webmanifest` | Service worker and PWA manifest |
| `Makefile` | `make update` shortcut |
| `.github/workflows/` | Convert, validate and deploy to GitHub Pages |
