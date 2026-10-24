/*
 * Name: patches.mjs
 * Purpose: Source patches the bundle applies to its dependencies -- each a
 *          bug fix, documented in README.md under "Fixes to bundled code".
 * Created: 2026-10-23
 * Author: Michael K. Steinberg
 *
 * scripts/build.mjs applies them while bundling. Each hunk has a regression
 * test in tests/streaming.test.mjs that fails without it.
 *
 * A hunk whose `find` text is not in the source exactly once fails the build:
 * a new version of that dependency needs a person to re-read the code.
 */

export const PATCHES = [
    {
        id: "unzipper-premature-end",
        module: "unzipper/lib/parse.js",
        why:
            "unzipper emits 'end' and 'close' as soon as its input finishes, while it may still " +
            "have entries to hand out. The streaming reader (src/lib/utils/iterate-stream.js) " +
            "stops at that 'end', so whenever it waits on one entry (writing a worksheet to a temp " +
            "file) long enough for the rest of the file to be read in, every later entry is dropped " +
            "without an error: worksheets, shared strings, styles, sheet names.",
        hunks: [
            {
                // End the output once every record is read, not when the input finishes.
                find: [
                    "  self.on('finish',function() {",
                    "    self.emit('end');",
                    "    self.emit('close');",
                    "  });",
                    "  self._readRecord().catch(function(e) {",
                    "    if (!self.__emittedError || self.__emittedError !== e)",
                    "      self.emit('error',e);",
                    "  });",
                ].join("\n"),
                replace: [
                    "  // Patched by @system-b90/excelts (scripts/patches.mjs): end the readable",
                    "  // side once every record has been read, not when the input finishes.",
                    "  self._readRecord().then(function() {",
                    "    if (!self._readableState.ended) self.push(null);",
                    "  }, function(e) {",
                    "    if (!self.__emittedError || self.__emittedError !== e)",
                    "      self.emit('error',e);",
                    "  });",
                ].join("\n"),
            },
            {
                // The premature 'end' also hid a FILE_ENDED error when input
                // stops cleanly between records -- a zip whose entries are all
                // intact but whose central directory is missing. The reader has
                // always read those; without this hunk the fix above makes them
                // throw.
                find: [
                    "Parse.prototype._readRecord = function () {",
                    "  var self = this;",
                    "  return self.pull(4).then(function(data) {",
                ].join("\n"),
                replace: [
                    "Parse.prototype._readRecord = function () {",
                    "  var self = this;",
                    "  // Patched by @system-b90/excelts (scripts/patches.mjs): input that ends",
                    "  // cleanly between two records ends the stream instead of failing.",
                    "  return new Promise(function(resolve) {",
                    "    function check() {",
                    "      if (self.buffer.length === 0 && !self.finished) return;",
                    "      self.removeListener('chunk', check);",
                    "      resolve(self.buffer.length > 0);",
                    "    }",
                    "    self.on('chunk', check);",
                    "    check();",
                    "  }).then(function(more) {",
                    "    return more ? self.pull(4) : Buffer.alloc(0);",
                    "  }).then(function(data) {",
                ].join("\n"),
            },
        ],
    },
];

/** The patches that target `file` (any path separator). */
export function patchesFor(file) {
    const normalized = file.replaceAll("\\", "/");
    return PATCHES.filter((p) => normalized.endsWith(`/node_modules/${p.module}`));
}

/** Applies every patch for `file` to `source`, failing loudly if a hunk no longer fits. */
export function applyPatches(file, source) {
    // Normalised so a Windows checkout's CRLF cannot make a hunk miss.
    let patched = source.replaceAll("\r\n", "\n");
    for (const patch of patchesFor(file)) {
        for (const [ i, { find, replace } ] of patch.hunks.entries()) {
            const count = patched.split(find).length - 1;
            if (count !== 1) {
                throw new Error(
                    `Patch ${patch.id} hunk ${i + 1} expected its target text once in ${patch.module}, ` +
                        `found it ${count} time(s). The dependency changed this code: re-read it, then update ` +
                        "or drop the patch.",
                );
            }
            patched = patched.replace(find, replace);
        }
    }
    return patched;
}
