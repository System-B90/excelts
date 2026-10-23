/*
 * Name: update-snapshots.mjs
 * Purpose: Re-records tests/snapshots/ from the current build.
 * Created: 2026-10-23
 * Author: Michael K. Steinberg
 *
 * Usage: npm run test:update-snapshots
 *
 * A snapshot is the package's observable behaviour, so re-recording one is a
 * behaviour change: review `git diff tests/snapshots` like code before
 * committing it. (An environment variable rather than a CLI flag, because
 * `node --test` runs every file in its own process.)
 */

import { spawnSync } from "node:child_process";

const { status } = spawnSync(process.execPath, [ "--test" ], {
    stdio: "inherit",
    env: { ...process.env, UPDATE_SNAPSHOTS: "1" },
});
process.exit(status ?? 1);
