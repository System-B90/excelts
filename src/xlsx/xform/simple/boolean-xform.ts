import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class BooleanXform extends BaseXform {
  tag: any;
  attr: any;
  model: any;

  constructor(options: any) {
    super();

    this.tag = options.tag;
    this.attr = options.attr;
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (model) {
      xmlStream.openNode(this.tag);
      xmlStream.closeNode();
    }
  }

  parseOpen(node: XmlNode) {
    if (node.name === this.tag) {
      this.model = true;
    }
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default BooleanXform;
