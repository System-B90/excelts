import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class DimensionXform extends BaseXform {
  model: any;

  get tag() {
    return 'dimension';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (model) {
      xmlStream.leafNode('dimension', {ref: model});
    }
  }

  parseOpen(node: XmlNode) {
    if (node.name === 'dimension') {
      this.model = node.attributes.ref;
      return true;
    }
    return false;
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default DimensionXform;
