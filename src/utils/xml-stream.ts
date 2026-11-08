import * as utils from "./utils";

/** Attribute values by name; `undefined` values are skipped. */
export type XmlAttributes = Readonly<Record<string, unknown>> | null | undefined;

const attributeToString = (name: string, value: unknown): string =>
  ` ${name}="${utils.xmlEncode(String(value))}"`;

function attributesToString(attributes: XmlAttributes): string {
  let result = "";
  if (attributes) {
    for (const name of Object.keys(attributes)) {
      const value = attributes[name];
      if (value !== undefined) {
        result += attributeToString(name, value);
      }
    }
  }
  return result;
}

/** Builds an XML document one node at a time, writing straight into a string. */
class XmlStream {
  static StdDocAttributes = {
    version: "1.0",
    encoding: "UTF-8",
    standalone: "yes",
  };

  private _xml = "";

  private readonly _stack: string[] = [];

  private readonly _rollbacks: { xml: number; stack: number; leaf: boolean; open: boolean }[] = [];

  /** Is the current node's start tag still open for attributes? */
  open = false;

  /** Has the current node had no content yet (so it can close as `<a/>`)? */
  leaf = false;

  get tos(): string | undefined {
    return this._stack[this._stack.length - 1];
  }

  /** How much has been written: a handy way to track whether anything was added. */
  get cursor(): number {
    return this._xml.length;
  }

  openXml(docAttributes?: XmlAttributes): void {
    // <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    this._xml += `<?xml${attributesToString(docAttributes)}?>\n`;
  }

  openNode(name: string, attributes?: XmlAttributes): void {
    if (this._stack.length && this.open) {
      this._xml += ">";
    }

    this._stack.push(name);

    // start streaming node
    this._xml += `<${name}${attributesToString(attributes)}`;
    this.leaf = true;
    this.open = true;
  }

  addAttribute(name: string, value: unknown): void {
    if (!this.open) {
      throw new Error("Cannot write attributes to node if it is not open");
    }
    if (value !== undefined) {
      this._xml += attributeToString(name, value);
    }
  }

  addAttributes(attrs: XmlAttributes): void {
    if (!this.open) {
      throw new Error("Cannot write attributes to node if it is not open");
    }
    this._xml += attributesToString(attrs);
  }

  writeText(text: unknown): void {
    if (this.open) {
      this._xml += ">";
      this.open = false;
    }
    this.leaf = false;
    this._xml += utils.xmlEncode(String(text));
  }

  /** Appends pre-built XML as the current node's content. */
  writeXml(xml: string): void {
    if (this.open) {
      this._xml += ">";
      this.open = false;
    }
    this.leaf = false;
    this._xml += xml;
  }

  closeNode(): void {
    const node = this._stack.pop();
    this._xml += this.leaf ? "/>" : `</${node}>`;
    this.open = false;
    this.leaf = false;
  }

  leafNode(name: string, attributes?: XmlAttributes, text?: unknown): void {
    this.openNode(name, attributes);
    if (text !== undefined) {
      // zeros need to be written
      this.writeText(text);
    }
    this.closeNode();
  }

  closeAll(): void {
    while (this._stack.length) {
      this.closeNode();
    }
  }

  addRollback(): number {
    this._rollbacks.push({
      xml: this._xml.length,
      stack: this._stack.length,
      leaf: this.leaf,
      open: this.open,
    });
    return this.cursor;
  }

  commit(): void {
    this._rollbacks.pop();
  }

  rollback(): void {
    const r = this._rollbacks.pop();
    if (!r) {
      throw new Error("Nothing to roll back");
    }
    if (this._xml.length > r.xml) {
      this._xml = this._xml.slice(0, r.xml);
    }
    if (this._stack.length > r.stack) {
      this._stack.length = r.stack;
    }
    this.leaf = r.leaf;
    this.open = r.open;
  }

  get xml(): string {
    this.closeAll();
    return this._xml;
  }
}

export default XmlStream;
