# Contributing to AlimenCal

Thanks for your interest in improving AlimenCal! :heart:

## Project conventions (read AGENTS.md first)

`AGENTS.md` is **binding for all changes**, human or automated. Key rules:

- **Docs-in-sync:** any change to code, config, reference values, presets,
  UI, i18n or tests **must** update docs and README in the same change.
  A change without doc updates is considered incomplete and will not be merged.
- The app is **plain HTML/CSS/Vanilla JS** — no build step, no framework,
  no server. Keep it that way.

## How to contribute

1. **Issue first:** For anything bigger than a typo fix, please open an
   issue describing the intended change before investing work.
2. **Fork & branch:** Fork the repository, create a branch from `main`
   (e.g. `feature/kinderzuschlag-fix`).
3. **Small, focused changes:** One topic per pull request.
4. **Run the tests** before submitting:
   ```bash
   for f in tests/*.test.js; do node "$f"; done
   ```
   All tests must pass. New features require new tests
   (see `docs/TESTS.md` for conventions).
5. **Update docs** as required by the docs-in-sync rule (README,
   `docs/BENUTZERHANDBUCH.md`, affected spec documents).
6. **Pull request:** Open a PR against `main` with a clear description
   of *what* and *why*. Screenshots help for UI changes.

## Legal accuracy matters

AlimenCal implements Swiss family-law calculations (ZGB) and official
guidelines. When changing calculation logic or reference values:

- Cite the legal basis (BGE, ZGB article, guideline) in the PR description.
- Do not change methodology without a documented legal source.
- Mark legal assumptions as such — the tool is an orientation aid,
  not legal advice.

## Code style

- Vanilla JS (ES modules where already used), 2-space indentation,
  semantic naming.
- UI strings are localized (de/fr/it/en) — add all four languages.
- No new runtime dependencies without prior discussion.

## Reporting issues

Use the issue tracker for bugs and feature requests. For security issues,
see `SECURITY.md` — do not open public issues for those.
