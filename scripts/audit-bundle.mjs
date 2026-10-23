/*
 * Name: audit-bundle.mjs
 * Purpose: Surfaces security advisories against code inside the bundle.
 * Created: 2026-10-23
 * Author: Michael K. Steinberg
 *
 * Usage: npm run build && npm run audit:bundle
 *
 * Bundling has a cost: a consumer's `npm audit` sees one dependency-free
 * package and can no longer report advisories in the ~60 packages compiled
 * into it. This repo has to watch on their behalf. The packages that ship are
 * this repo's devDependency tree, so `npm audit` here sees them; this script
 * narrows its report to the packages actually in dist/index.cjs and fails on
 * any advisory nobody has reviewed yet. CI runs it weekly, so a new advisory
 * fails a build even when nothing in this repo changed.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Advisories confirmed not to affect the bundle, with the reason. Each entry
 * is a decision someone made after reading how src/ uses the package;
 * remove it once the bundled version is no longer affected.
 */
const REVIEWED = {
    "GHSA-w5hq-g745-h8pq":
        "uuid: the missing bounds check is in v3/v5/v6 with a caller-supplied buffer. " +
        "src/ only ever calls v4() with no arguments (src/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js).",
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const provenance = JSON.parse(readFileSync(join(ROOT, "dist", "provenance.json"), "utf8"));
const bundled = new Set(provenance.bundledPackages.map((p) => p.name));

/** `npm audit` exits non-zero whenever it finds anything; the JSON is what matters. */
function audit() {
    try {
        return execFileSync("npm", [ "audit", "--json" ], {
            cwd: ROOT,
            encoding: "utf8",
            stdio: [ "ignore", "pipe", "inherit" ],
            shell: process.platform === "win32",
        });
    } catch (error) {
        if (error.stdout) return error.stdout;
        throw error;
    }
}

const report = JSON.parse(audit());
if (report.error) throw new Error(`npm audit failed: ${JSON.stringify(report.error)}`);

const findings = Object.values(report.vulnerabilities ?? {})
    .filter((v) => bundled.has(v.name))
    .flatMap((v) =>
        v.via
            // String entries point at another vulnerable package, which is
            // reported in its own right.
            .filter((via) => typeof via === "object")
            .map((via) => ({
                pkg: v.name,
                range: via.range,
                severity: via.severity,
                id: via.url?.split("/").pop() ?? String(via.source),
                title: via.title,
                url: via.url,
            })),
    );

const unreviewed = findings.filter((f) => !REVIEWED[f.id]);

for (const f of findings.filter((f) => REVIEWED[f.id])) {
    console.log(`reviewed  ${f.id}  ${f.pkg} ${f.range}: ${REVIEWED[f.id]}`);
}
for (const f of unreviewed) {
    console.error(`UNREVIEWED  ${f.severity}  ${f.id}  ${f.pkg} ${f.range}: ${f.title}\n            ${f.url}`);
}

const stale = Object.keys(REVIEWED).filter((id) => !findings.some((f) => f.id === id));
for (const id of stale) console.log(`stale     ${id} no longer applies; remove it from REVIEWED.`);

if (unreviewed.length > 0) {
    console.error(
        `\n${unreviewed.length} advisory(ies) affect code inside dist/index.cjs. Either bump the ` +
            "dependency that brings it in, or confirm src/ cannot reach the affected code and " +
            "record why in REVIEWED.",
    );
    process.exit(1);
}
console.log(`✓ No unreviewed advisories in the ${bundled.size} bundled packages`);
