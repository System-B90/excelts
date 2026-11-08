import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class StringXform extends BaseXform {
  tag: any;
  attr: any;
  attrs: any;
  model: any;
  text: any;

  constructor(options) {
    super();

    this.tag = options.tag;
    this.attr = options.attr;
    this.attrs = options.attrs;
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (model !== undefined) {
      xmlStream.openNode(this.tag);
      if (this.attrs) {
        xmlStream.addAttributes(this.attrs);
      }
      if (this.attr) {
        xmlStream.addAttribute(this.attr, model);
      } else {
        xmlStream.writeText(model);
      }
      xmlStream.closeNode();
    }
  }

  parseOpen(node: XmlNode) {
    if (node.name === this.tag) {
      if (this.attr) {
        this.model = node.attributes[this.attr];
      } else {
        this.text = [];
      }
    }
  }

  parseText(text: string) {
    if (!this.attr) {
      this.text.push(text);
    }
  }

  parseClose() {
    if (!this.attr) {
      this.model = this.text.join('');
    }
    return false;
  }
}

export default StringXform;
