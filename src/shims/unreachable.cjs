/*
 * Stand-in for modules that are bundled only because a dependency requires
 * them at load time, on code paths this library never takes:
 *
 *   fstream      unzipper's Extract() / Open.directory() -- extract to disk
 *   glob         archiver-utils' file expansion          -- archive a glob
 *   readdir-glob archiver's directory() / glob()          -- archive a folder
 *   buffers      binary's stream() parser  } unzipper only ever calls
 *   chainsaw     binary's stream() parser  } binary.parse(buffer)
 *
 * The first three make Turbopack trace the whole consuming project through
 * their dynamic `path.resolve` / `fs` calls. `buffers` declares no licence at
 * all, so it must not ship in an open-source bundle; `chainsaw` goes with it,
 * being the other half of the same dead code path.
 *
 * Loading this module is harmless -- unzipper reads `require("fstream").Writer`
 * at load time -- but calling or constructing anything on it throws, naming
 * the module, rather than failing later with "x is not a function".
 */

"use strict";

module.exports = function unreachable(name) {
    // A `function`, not an arrow: only a constructible target lets the proxy
    // trap `new`, which is how unzipper would use fstream's Writer.
    function fail() {
        throw new Error(
            `@system-b90/excelts: '${name}' is not bundled. This library never calls it; ` +
                "if you reached this, please open an issue with the stack trace.",
        );
    }
    // Every property is the stub again, so `require("fstream").Writer` loads
    // fine and fails with this message only once something calls it.
    const stub = new Proxy(fail, {
        apply: fail,
        construct: fail,
        get: (_target, prop) => (prop === "__esModule" ? false : stub),
    });
    return stub;
};
