# Menu update notes

The current public app is fully static and reads `data/menu.json`.

For each new 15-day menu:
- keep all web-app files unchanged;
- replace only `data/menu.json`;
- optionally archive the original Excel as `source/menu.xlsx`.

This design is safer than putting GitHub credentials or an admin password inside a public static website.
