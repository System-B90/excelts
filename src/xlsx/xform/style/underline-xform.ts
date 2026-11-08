import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class UnderlineXform extends BaseXform {
  static Attributes: Record<string, Record<string, string>> = {
    single: {},
    double: {val: 'double'},
    singleAccounting: {val: 'singleAccounting'},
    doubleAccounting: {val: 'doubleAccounting'},
  };

  model: any;

  constructor(model?: any) {
    super();

    this.model = model;
  }

  get tag() {
    return 'u';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    model = model || this.model;

    if (model === true) {
      xmlStream.leafNode('u');
    } else {
      const attr = UnderlineXform.Attributes[model];
      if (attr) {
        xmlStream.leafNode('u', attr);
      }
    }
  }

  parseOpen(node: XmlNode) {
    if (node.name === 'u') {
      this.model = node.attributes.val || true;
    }
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default UnderlineXform;
