import { EventEmitter } from "node:events";
import zlib from "node:zlib";

import StreamBuf from "./stream-buf";

/** The subset of zip generation options the writer honours. */
export interface ZipOptions {
  /** `"DEFLATE"` (the default) or `"STORE"` for no compression. */
  compression?: "DEFLATE" | "STORE";
  compressionOptions?: { level?: number } | null;
}

interface Entry {
  name: Buffer;
  data: Buffer;
  crc: number;
  /** Uncompressed size. */
  size: number;
  method: 0 | 8;
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  // Node >= 20.15 / 22.2 has a native, much faster implementation.
  if (typeof zlib.crc32 === "function") return zlib.crc32(data);
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const MAX_UINT32 = 0xffffffff;
const MAX_UINT16 = 0xffff;

/** MS-DOS date and time, as zip headers store them. */
function dosDateTime(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Collects entries in memory, then packs them into one zip -- compressed with
 * Node's native zlib -- and writes it to the stream it was piped to. Emits
 * `finish` once the zip has been written. Archives needing Zip64 (4GB, or
 * 65535 entries) are not supported.
 */
class ZipWriter extends EventEmitter {
  private readonly store: boolean;

  private readonly level: number | undefined;

  private readonly entries: Entry[] = [];

  private readonly stream = new StreamBuf();

  constructor(options?: ZipOptions) {
    super();
    this.store = options?.compression === "STORE";
    this.level = options?.compressionOptions?.level ?? undefined;
  }

  append(data: string | Buffer, options: { name: string; base64?: boolean }): void {
    const raw = typeof data === "string" ? Buffer.from(data, options.base64 ? "base64" : "utf8") : data;
    const compressed = this.store ? undefined : zlib.deflateRawSync(raw, { level: this.level });
    this.entries.push({
      name: Buffer.from(options.name, "utf8"),
      data: compressed ?? raw,
      crc: crc32(raw),
      size: raw.length,
      method: compressed ? 8 : 0,
    });
  }

  async finalize(): Promise<void> {
    this.stream.end(this.pack());
    this.emit("finish");
  }

  private pack(): Buffer {
    if (this.entries.length > MAX_UINT16) throw new Error("Too many entries for a zip without Zip64");
    const { time, date } = dosDateTime(new Date());
    const parts: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;

    for (const entry of this.entries) {
      if (entry.data.length > MAX_UINT32 || entry.size > MAX_UINT32 || offset > MAX_UINT32) {
        throw new Error("Archive too large for a zip without Zip64");
      }
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4); // version needed
      local.writeUInt16LE(0x0800, 6); // names are UTF-8
      local.writeUInt16LE(entry.method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(entry.crc, 14);
      local.writeUInt32LE(entry.data.length, 18);
      local.writeUInt32LE(entry.size, 22);
      local.writeUInt16LE(entry.name.length, 26);
      parts.push(local, entry.name, entry.data);

      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(20, 4); // version made by
      local.copy(header, 6, 4, 30); // version needed .. name length, as in the local header
      header.writeUInt32LE(offset, 42);
      central.push(header, entry.name);

      offset += local.length + entry.name.length + entry.data.length;
    }

    const centralSize = central.reduce((n, b) => n + b.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...parts, ...central, end]);
  }

  pipe(destination: NodeJS.WritableStream): void {
    this.stream.pipe(destination);
  }
}

export { ZipWriter };
