# Agent Guide: Brian Line Tower Wars

## Mission

Build and maintain a mobile-first lane-defense game where the player places towers and attackers during Prep, the AI mirrors that flow, and Battle resolves with clear scoring and wave progression.

## Canonical surfaces

- `www/` is the only shipped web runtime. Edit playable HTML, CSS, JS, and runtime assets there.
- `android/` wraps the same runtime through Capacitor with `webDir: "www"`.
- `harness/` is test and simulation tooling. It must consume `www/` as an external runtime surface, not a duplicate implementation.
- `Reference/` is non-runtime material only.
- `Learnings/` stores reusable investigation notes and lessons.

## Supported workflows

- Human local launch: `.\run-game.bat`
- Manual preview server: `.\preview.ps1`
- Under the hood, preview serves `www/` as the document root and keeps preview-only mutable data outside the shipped bundle.
- Public web publishing targets `www/` directly through the Pages workflow.

## Reference tree contract

- `Reference/docs/` contains design notes, art guidance, issue docs, and workflow references.
- `Reference/art/` contains non-runtime source art and archival art references.
- `Reference/balance/` contains balance sheets and other authoring-only tuning material.
- Do not treat `Reference/` as an app root.
- Do not duplicate shipped runtime assets into `Reference/` unless the task is explicitly about asset archival and the copy is not an exact shipped duplicate.

## Context manifests

Load these additional reference docs when the task touches their area:

- `Reference/docs/ARTIST_GUIDANCE.md`
  Read this when creating, replacing, exporting, naming, or ingesting runtime art assets for towers, creeps, battlefield skins, or options-menu art.
- `Reference/docs/BATTLE_SCREEN_TEMPLATE_DIRECTIONS.md`
  Read this when working from the battle-screen bleed template, placing HUD or battlefield anchors, reviewing battlefield compositions, or giving layout instructions to artists against the source artboard.
- `Reference/docs/COMPOSER_GUIDANCE.md`
  Read this when adding, reviewing, organizing, converting, or specifying music and audio deliverables, especially contributor pack structure, file formats, looping expectations, and app-size constraints.
- `Reference/docs/VIEWPORT_CONTRACT.md`
  Read this when changing viewport behavior, arena scaling, safe-area handling, canvas dimensions, overlay positioning, or anything that could alter the fixed `420 x 760` gameplay frame.

## Runtime rules

- Do not recreate playable root-level runtime files or alternate launch surfaces.
- Keep runtime paths document-relative so `www/` works the same in preview, GitHub Pages, and Capacitor.
- Avoid adding a bundling/build step unless the user explicitly asks for one.
- Preserve the mission and target gameplay loop while doing structural cleanup.

## Gameplay implementation rules

- Keep code plain JavaScript.
- Prefer a single source of truth for game state instead of scattered globals.
- Use constants for balancing and simulation tuning.
- Separate state, simulation rules, rendering, input, and loop concerns within the runtime code.
- Keep the DOM contract intentional; if HTML IDs change, update runtime code deliberately rather than layering compatibility hacks.

## Definition of done

- No console errors on load.
- `.\run-game.bat` and `.\preview.ps1` both serve the canonical runtime successfully.
- UI stays in sync with runtime state.
- Replay/reset flows return the game to a clean state.
- Harness and wrapper assumptions remain aligned to `www/`.
