# Www Runtime Consolidation - 2026-05-20

## Summary

Line Tower Wars now has one canonical shipped web runtime under `www/`. Local preview, GitHub Pages, Capacitor, and the harness should all consume that same surface instead of maintaining duplicate playable roots.

## Symptom

- Root-level `index.html`, `style.css`, `script.js`, and helper files had drifted into a second playable app surface.
- The preview workflow, deployment config, and repo docs no longer agreed about which runtime was authoritative.
- Balance sheets and preview-only telemetry were mixed into the runtime bundle.

## Root Cause

- The repo evolved without a strict single-runtime rule.
- Launch helpers and docs kept older root-oriented assumptions alive after `www/` already existed.
- Reference material and authoring data were not clearly separated from shipped runtime content.

## Fix

- Treat `www/` as the only shipped web runtime.
- Serve `www/` as the preview server document root.
- Keep preview-only mutable data in `.preview-data/`, including `.preview-data/match-stats.json`.
- Keep the supported launch path thin and linear:
  - `run-game.bat` -> `open-game.ps1` -> `preview.ps1`
- Publish GitHub Pages from `./www`.
- Keep Capacitor pointed at `webDir: "www"`.
- Keep harness consumers loading `www/` as an external runtime surface.
- Keep authoring-only balance sheets in `Reference/balance/`.
- Keep docs and source art in `Reference/docs/` and `Reference/art/`, not in the runtime tree.

## Guardrails

- Do not recreate root-level playable runtime files as wrappers, mirrors, or convenience copies.
- Runtime asset paths should stay document-relative so preview, Pages, and Capacitor resolve the same files.
- Preview-only state must stay outside `www/`.
- If a task changes launch, preview, publishing, or wrapper behavior, verify all of them still point at `www/`.

## Files To Check First

- `www/`
- `preview.ps1`
- `open-game.ps1`
- `run-game.bat`
- `.github/workflows/deploy-pages.yml`
- `capacitor.config.json`
- `harness/run.js`
- `Reference/`

## Search Phrases

- `www/ is the only shipped web runtime`
- `preview serves www`
- `.preview-data`
- `upload-pages-artifact path ./www`
- `webDir: "www"`

## Verification

- `preview.ps1` returns `200` for `/`, `/script.js`, and `/stats`.
- `open-game.ps1 -NoBrowser` launches a working preview instance.
- `harness/run.js` reports that it is serving `...\\www` and completes a match run.
- Repo docs and agent contracts point contributors at `www/`, not a root runtime.
