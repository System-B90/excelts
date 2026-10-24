# @system-b90/excelts

Read, write and stream Excel spreadsheets (XLSX) and CSV in Node.js — with
**zero dependencies**. One package, fully typed, works with `import` and
`require`, and runs inside Next.js server routes as-is.

```ts
import { Workbook } from "@system-b90/excelts";

const workbook = new Workbook();
workbook.addWorksheet("Sheet").addRow([ "hello", 42 ]);
const buffer = await workbook.xlsx.writeBuffer();
```

## Quick Start

```bash
npm install @system-b90/excelts
```

```js
// ESM
import excelts, { Workbook, ValueType, stream } from "@system-b90/excelts";

// CommonJS
const excelts = require("@system-b90/excelts");
```

Full API documentation: [docs/API.md](docs/API.md).

## Features

- **Workbooks and worksheets**: properties, views (frozen, split,
  right-to-left), page setup, headers and footers, sheet state and protection.
- **Cells**: numbers, strings, dates, booleans, errors, rich text, hyperlinks,
  formulas (shared and array), merged cells, notes.
- **Styling**: fonts, fills (pattern and gradient), borders, alignment, number
  formats, cell protection.
- **Structure**: columns, rows, outline levels, row insertion and splicing,
  defined names, auto filters, tables.
- **Rules**: data validation and conditional formatting (cell-is, expression,
  top 10, above average, color scale, icon set, data bar, contains text, time
  period).
- **Images**: from a buffer, base64 or a file, over a range, in a cell, as a
  sheet background, with hyperlinks.
- **I/O**: XLSX and CSV from and to a buffer, a stream or a file; streaming
  XLSX writer and reader for files too large for memory.

## Why one package

Every runtime dependency is compiled into the package itself: a 312KB download,
1.1MB unpacked, and nothing else to install, audit or keep patched in every
`npm ci` and Docker layer.

## Usage

Everything is exported both as a named export and from the default export:

| Export | What it is |
| --- | --- |
| `Workbook` | Read, build and write workbooks: `.xlsx` (buffer, stream, file) and `.csv` |
| `ModelContainer` | Writes a serialised `workbook.model` without rebuilding a `Workbook` |
| `stream.xlsx.WorkbookWriter` | Streaming writer for large files |
| `stream.xlsx.WorkbookReader` | Streaming reader for large files |
| `ValueType`, `FormulaType`, `RelationshipType`, `DocumentType`, `ReadingOrder`, `ErrorValue` | Enums |

Types ship with the package — `Worksheet`, `Cell`, `CellValue`, `Fill`,
`Borders` and the rest — and resolve under every TypeScript module mode:
`nodenext` (ESM and CJS), `bundler`, and legacy `node10`.

```ts
import { Workbook, type Cell, type Worksheet } from "@system-b90/excelts";
```

### Next.js

Works in route handlers and server components, including `output: "standalone"`
builds with Turbopack. No `serverExternalPackages` entry is needed.

```ts
// app/export/route.ts
import { Workbook } from "@system-b90/excelts";

export async function GET() {
    const workbook = new Workbook();
    workbook.addWorksheet("Report").addRow([ "hello" ]);
    return new Response(await workbook.xlsx.writeBuffer(), {
        headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    });
}
```

### Requirements

Node.js 20 or newer. Server-side only.

## How it is built

The library lives in [`src/`](src/). [`scripts/build.mjs`](scripts/build.mjs)
compiles it, together with the libraries it uses — `archiver`, `jszip`,
`unzipper`, `saxes`, `fast-csv`, `dayjs`, `uuid` and `readable-stream`, each
pinned to an exact version — into `dist/index.cjs`.

### Fixes to bundled code

**unzipper ending its output early.** `unzipper` announces the end of its
output as soon as its *input* has been read, even while it still has entries to
hand out. The streaming reader stops at that signal, so whenever it pauses on
one entry — writing a worksheet to a temp file, say — long enough for the rest
of the file to be read in, every later entry is lost **without an error**:
later worksheets, shared strings, styles and sheet names. Slow filesystems
(Windows, macOS) make it likely; a 20ms delay on temp-file creation makes it
happen on every read.

The build patches `unzipper` to end its output only after the last record is
read, while still reading zips whose central directory is missing. The patch is
in [`scripts/patches.mjs`](scripts/patches.mjs); the build fails if the
dependency's code ever stops matching it. Each of its two hunks has a
regression test that fails without it.

### Modules swapped out

| Module | Pulled in by | What happens instead |
| --- | --- | --- |
| `tmp` | the streaming reader's temp files | **Replaced** by a ~100-line shim covering exactly what the reader uses. Temp files go under `os.tmpdir()/excelts-*`, owner-only, and are removed as soon as each worksheet is read. |
| `fstream` | unzipper's `Extract()` / `Open.directory()` | Stubbed: never called. |
| `glob`, `readdir-glob` | archiver's `directory()` / `glob()` | Stubbed: never called. |
| `buffers`, `chainsaw` | `binary`'s stream parser | Stubbed: unzipper only uses `binary.parse()`. |

`tmp` and the first three stubbed modules make Turbopack trace every file
around the bundle into a Next.js standalone build. `buffers` declares no
licence at all, so it cannot ship in an open-source bundle. A stub loads
harmlessly but throws a clear error, naming the module, if anything ever calls
it — the [shim sources](src/shims/) explain each in detail.

## How it is verified

CI proves the following on every change, on Node 20–26, Linux, Windows and
macOS:

- **Behaviour.** Every scenario's result must equal its recorded snapshot in
  [`tests/snapshots/`](tests/snapshots/): a workbook using every documented
  feature, written and re-read through a buffer, a file, a stream and
  `ModelContainer`; CSV with its options; the streaming writer and reader
  (iterator and event APIs); row insertion and splicing; sheet protection; the
  export surface itself.
- **Self-containment.** No dependencies of any kind; the bundle `require`s only
  Node builtins, by literal name; it runs from a directory with no
  `node_modules` anywhere near it; `npm pack` ships exactly the expected files.
- **Types.** Consumer code compiles under `strict` with `skipLibCheck: false` in
  all four TypeScript module modes, against the shipped declarations.
- **Next.js.** `npm run test:turbopack` builds a standalone Next.js app on the
  packed tarball, fails if Turbopack traces any file from this package, then
  serves a workbook and streams one back through the temp-file path.
- **Advisories.** `npm run audit:bundle`, also weekly, fails on any advisory
  against a bundled package that nobody has reviewed.

## Security

Because a consumer's `npm audit` sees a package with no dependencies, it cannot
report advisories in the code bundled inside. This repository watches on its
behalf: `npm run audit:bundle` runs on every change and weekly, and fails on any
advisory against a bundled package until it is fixed or reviewed. Reviewed
advisories, with the reason each one cannot be reached, live in
[`scripts/audit-bundle.mjs`](scripts/audit-bundle.mjs). Currently:

| Advisory | Package | Why the bundle is not affected |
| --- | --- | --- |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | `uuid@8.3.2` | The missing bounds check is in `v3`/`v5`/`v6` with a caller-supplied buffer; this library only calls `v4()`. |

Report vulnerabilities through
[GitHub security advisories](https://github.com/System-B90/excelts/security/advisories/new).

## Versions

`@system-b90/excelts` follows semver. `dist/provenance.json` in every release
records what it was built from: the esbuild version, the SHA-256 of the bundle,
every bundled package with its licence, and the patches applied. The build is
byte-reproducible: `npm ci && npm run build` on a release's tag yields that same
SHA-256, so anyone can check that a published bundle is what this source
produces.

## Development

```bash
npm ci
npm test                       # builds dist/, then runs every suite
npm run test:types             # typechecks consumers in every module mode
npm run test:turbopack         # builds + runs a Next.js app on the packed package
npm run audit:bundle           # advisories against bundled packages
npm run test:update-snapshots  # re-records tests/snapshots/ from the build
```

A snapshot is the package's observable behaviour. Re-record one only for a
deliberate behaviour change, and review `git diff tests/snapshots` like code.
Dependabot bumps the bundled libraries; a bump is green only if every snapshot
still matches.

### Releasing

1. Bump `version` in `package.json`.
2. Publish a GitHub release tagged `v<version>`.

`.github/workflows/publish.yml` re-runs every check on the release commit, then
publishes to GitHub Packages (for consumers whose `.npmrc` routes `@system-b90`
there) and then to npmjs.org with provenance. GitHub Packages needs nothing
beyond the workflow's own token, so it works from the first release. npmjs.org
needs, once:

- the `system-b90` organisation on npmjs.com, and
- either an `NPM_TOKEN` repository secret (an npm automation token with publish
  rights to the scope) or npm trusted publishing configured for this repository
  and `publish.yml`. Trusted publishing can only be set up once the package
  exists, so the first release needs the token.

## License

[MIT](LICENSE). The bundle also contains third-party packages, each under its
own licence, reproduced in full in `dist/THIRD_PARTY_NOTICES.md`.
