# Contributing

## Branching

- Do not commit directly to `main`.
- Create a feature branch per task:
  - `feature/<short-topic>`
  - `fix/<short-topic>`
  - `balance/<short-topic>`

## Pull Requests

- Keep PRs focused (single feature/fix).
- Include a short test note:
  - what was changed
  - how to verify locally
- For gameplay tuning, update:
  - `Reference/balance/tower-balance-sheet.csv`
  - `Reference/balance/creep-balance-sheet.csv`

## Local Run

```powershell
.\run-game.bat
```

This is the supported local entry point.

For manual server-only preview:

```powershell
.\preview.ps1
```
