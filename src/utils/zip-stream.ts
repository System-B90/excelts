import { EventEmitter } from "node:events";
import JSZip from "jszip";

import StreamBuf from "./stream-buf";

/** JSZip's generation options, plus the entry point for `compressionOptions` and friends. */
export type ZipOptions = Omit<JSZip.JSZipGeneratorOptions, "type">;

/**
 * Collects entries in memory, then packs them into one zip and writes it to the
 * stream it was piped to. Emits `finish` once the zip has been written.
 */
class ZipWriter extends EventEmitter {
  private readonly options: JSZip.JSZipGeneratorOptions<"nodebuffer">;

  private readonly zip = new JSZip();

  private readonly stream = new StreamBuf();

  constructor(options?: ZipOptions) {
    super();
    this.options = { compression: "DEFLATE", ...options, type: "nodebuffer" };
  }

  append(data: string | Buffer, options: { name: string; base64?: boolean }): void {
    if (options.base64) {
      this.zip.file(options.name, data, { base64: true });
    } else {
      this.zip.file(options.name, data);
    }
  }

  async finalize(): Promise<void> {
    const content = await this.zip.generateAsync(this.options);
    this.stream.end(content);
    this.emit("finish");
  }

  pipe(destination: NodeJS.WritableStream): void {
    this.stream.pipe(destination);
  }
}

export { ZipWriter };
