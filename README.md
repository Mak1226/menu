# Mess Menu — GitHub Pages

Standalone static web app. No Lovable dependency and no backend required.

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
