# Mess Menu

A lightweight GitHub Pages web app for viewing the SEDC mess menu.

## Updating the menu

You only need to replace one file:

`source/menu.xlsx`

Keep the filename exactly `menu.xlsx`.

When that file is committed to the `master` branch, GitHub Actions automatically:

1. reads the Excel workbook,
2. regenerates `data/menu.json`,
3. validates the generated menu,
4. deploys the updated site to GitHub Pages.

You do not need to edit `app.js`, `index.html`, or `data/menu.json` manually.

The converter expects the same general spreadsheet layout as the current SEDC menu: dates across row 1, meal section names in column A, and item/category labels in column B. Different dates are detected automatically.
