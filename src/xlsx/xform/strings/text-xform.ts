import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

//   <t xml:space="preserve"> is </t>

class TextXform extends BaseXform {
  _text: string[] = [];

  constructor() {
    super();
    // `model` is the collected text, read on demand: the parent xform reads it when the
    // closing tag arrives, without calling parseClose first. It is defined on the instance
    // because BaseXform declares `model` as a plain property; the empty setter lets
    // BaseXform.reset() assign null without throwing (this module runs in strict mode).
    Object.defineProperty(this, "model", {
      get: () =>
        this._text
          .join("")
          .replace(/_x([0-9A-F]{4})_/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16))),
      set: () => {},
      configurable: true,
    });
  }

  get tag() {
    return 't';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode('t');
    if (/^\s|\n|\s$/.test(model)) {
      xmlStream.addAttribute('xml:space', 'preserve');
    }
    xmlStream.writeText(model);
    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case 't':
        this._text = [];
        return true;
      default:
        return false;
    }
  }

  parseText(text: string) {
    this._text.push(text);
  }

  parseClose() {
    return false;
  }
}

export default TextXform;
