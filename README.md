# Mess Menu — GitHub Pages version (v2)

Standalone static web app. No Lovable dependency and no backend required.

## What's changed in v2

- Search and all quick filters only show results from the **current/next meal onward**.
- The `Paneer` filter has been replaced with **Veg**.
- **Veg** and **Non-Veg** are not broad dietary searches.
- They show only genuine vegetarian/non-vegetarian alternatives offered for the same meal.
- Breakfast eggs/omelettes are not treated as a Non-Veg choice.
- Spreadsheet mislabels such as Rasam appearing in a Non-Veg column are ignored.
- Aug 12's Paneer/Chicken choice is corrected logically despite the source-column swap.

The genuine choice pairs are maintained in:

`data/choicePairs.json`

## Deploy

1. Create a GitHub repository.
2. Upload every file/folder in this project, including `.github`.
3. Use `main` as the default branch.
4. GitHub → Settings → Pages.
5. Set Source to **GitHub Actions**.
6. Push/commit the project.

The included workflow deploys the site automatically.

## Updating menus

Main menu data:

`data/menu.json`

Veg/non-veg alternatives:

`data/choicePairs.json`

When a new 15-day spreadsheet arrives, replace/update these data files.
The UI itself does not need modification.

A future Excel-import GitHub Action can automate this conversion completely.
