# Line Tower Wars

Self-contained lane-defense prototype inspired by Line Tower Wars mods from Warcraft 3.

## Repo map

- `www/` - Canonical shipped web runtime. Edit the playable app here only.
- `android/` - Capacitor Android wrapper.
- `harness/` - Headless simulation and runtime verification tooling that consumes `www/`.
- `Reference/docs/` - Non-runtime design notes, artist guidance, issue docs, and workflow references.
- `Reference/art/` - Non-runtime source art and archival art references.
- `Learnings/` - Reusable notes from past investigations.

## Supported local workflow

Standard launch:

```powershell
.\run-game.bat
```

This is the supported human entry point. It delegates to the preview server, serves `www/`, picks an open local port, and opens the browser automatically.

Manual preview server:

```powershell
.\preview.ps1 -Port 5510
```

Use this when you want the preview server without the launcher opening a browser.

## Deployment and wrapper

- GitHub Pages publishes `www/` directly through `.github/workflows/deploy-pages.yml`.
- Capacitor continues to use `www/` as its `webDir` in `capacitor.config.json`.
- There is no build step for the web runtime in this repo.

## Working rules

- Do not recreate a second playable app surface at the repo root.
- Keep runtime asset paths document-relative so preview, Pages, and Capacitor all resolve the same files.
- Treat `Reference/` as non-runtime material. If a doc mentions shipped assets, it should point at `www/assets/...`.
- Keep balance edits in `Reference/balance/`; those CSV files are authoring material, not runtime inputs.
