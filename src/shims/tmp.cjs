/*
 * Temp files for the streaming reader, in place of the `tmp` package.
 *
 * The streaming reader (`stream.xlsx.WorkbookReader`) parks a worksheet in a
 * temp file when it arrives in the zip before the shared strings it refers to
 * -- the usual order in files Excel writes, and in this library's own output.
 * It calls `file(cb)` and, at load time, `setGracefulCleanup()`. Nothing else.
 *
 * The `tmp` package's dynamic filesystem calls make Turbopack give up and
 * trace everything around the bundle into a Next.js standalone build.
 * Measured: with `tmp` bundled, every file in this package lands in a route's
 * trace; with this shim, none does (`npm run test:turbopack`).
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

/** Directories still on disk -> the open fd of the file inside, if any. */
const pending = new Map();

function closeQuietly(fd) {
    try {
        fs.closeSync(fd);
    } catch {
        // Already closed: nothing left to release.
    }
}

function removeDir(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
        pending.delete(dir);
    } catch {
        // Windows refuses while the reader's read stream still holds the file;
        // it closes moments later. Retry off the event loop, and leave the
        // exit sweep as the backstop.
        fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }, (err) => {
            if (!err) pending.delete(dir);
        });
    }
}

function removeAllSync() {
    for (const [ dir, fd ] of pending) {
        // Closed first: Windows cannot delete a file that is still open.
        if (fd !== undefined) closeQuietly(fd);
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        } catch {
            // Best effort at exit: the OS reaps its temp dir eventually anyway.
        }
    }
}

/**
 * `tmp.file(callback)`: creates an empty, owner-only file and hands back
 * `(err, path, fd, cleanup)`. Each file gets its own `mkdtemp` directory, so
 * the name is unguessable without any retry loop.
 */
function file(callback) {
    fs.mkdtemp(path.join(os.tmpdir(), "excelts-"), (mkdirErr, dir) => {
        if (mkdirErr) {
            callback(mkdirErr);
            return;
        }
        pending.set(dir, undefined);
        const name = path.join(dir, "entry.xml");
        fs.open(name, "wx", 0o600, (openErr, fd) => {
            if (openErr) {
                removeDir(dir);
                callback(openErr);
                return;
            }
            pending.set(dir, fd);
            // Synchronous, unlike tmp's: the reader never waits on it, so the
            // file is gone by the time the next worksheet is read.
            let cleaned = false;
            const cleanup = (next) => {
                if (!cleaned) {
                    cleaned = true;
                    closeQuietly(fd);
                    pending.set(dir, undefined);
                    removeDir(dir);
                }
                if (typeof next === "function") next();
            };
            callback(null, name, fd, cleanup);
        });
    });
}

let graceful = false;

/** Removes any temp file not cleaned up explicitly when the process exits. */
function setGracefulCleanup() {
    if (graceful) return;
    graceful = true;
    process.once("exit", removeAllSync);
}

module.exports = { file, setGracefulCleanup };
