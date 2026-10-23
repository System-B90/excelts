# CLAUDE.md — excelts

Org-wide conventions (repo list, package scopes, git workflow, commit format, CI secrets)
live in
[System-B90/.github CLAUDE.md](https://github.com/System-B90/.github/blob/main/CLAUDE.md).
This file covers what's specific to excelts — including the two places it deliberately
departs from them.

## What excelts is

A spreadsheet library (XLSX read/write/stream, CSV) with zero runtime dependencies,
published as `@system-b90/excelts` to **npmjs.org** (public) and GitHub Packages. The
library lives in `src/lib/`; `scripts/build.mjs` bundles it with the libraries it uses
(`archiver`, `jszip`, `unzipper`, `saxes`, `fast-csv`, `dayjs`, `uuid`, `readable-stream`
— exact-pinned devDependencies) into `dist/index.cjs`. README.md describes the package;
`docs/API.md` documents the API.

## Departures from org conventions

- **Public repo, MIT licence, published to npmjs.org.** It is open source on purpose. Never
  commit anything org-internal here (hostnames, repo names, issue links, secrets).
- **GitHub-hosted runners only.** Never `runs-on: self-hosted` in this repo: on a public
  repo that runs fork PRs' code on the org's box. Hosted minutes are free for public repos.

## The one rule

**Behaviour is pinned by `tests/snapshots/`.** Each scenario's result — a workbook re-read
in full, CSV text, the rows a streaming read yields, the export surface — must equal its
recorded snapshot. A changed snapshot is a behaviour change: re-record with
`npm run test:update-snapshots` only on purpose, and review `git diff tests/snapshots`
like code. A new feature test goes through `snapshot()` in `tests/helpers.mjs`, plus an
explicit assertion so the snapshot is known to cover something.

## Things that look optional and are not

- `keepNames: true` in `scripts/build.mjs`: `src/lib/doc/worksheet.js` compares
  `constructor.name`.
- `src/shims/tmp.cjs`: the streaming reader needs temp files; the `tmp` package breaks
  Turbopack.
- `LICENSE` keeps two copyright lines. The second is the original author's notice for the
  code in `src/lib/`; MIT requires it in every copy. Never remove it.
- The licence allowlist and `THIRD_PARTY_NOTICES.md`: they are what makes redistributing the
  bundled libraries legal. Never widen `ALLOWED_LICENSES` without reading the licence.
- `npm run audit:bundle`: consumers' `npm audit` cannot see bundled code. A new advisory
  goes in `REVIEWED` only with the reason `src/` cannot reach the affected code.
- `npm run test:turbopack`: the only real check that Next.js can trace the bundle.
- `scripts/patches.mjs`: without it the streaming reader silently drops entries whenever
  it pauses long enough for the input to finish (Windows and macOS CI hit this).

## Git

Commit format: `Vibe-<PastTenseVerb> <description>` (e.g. `Vibe-Fixed`, `Vibe-Added`). No
`feat:`/`fix:`/`chore:` prefixes. Never commit directly to `master` — feature branch + PR.
Bump the package version deliberately before releasing — consumers pin exact versions.
