import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class DrawingXform extends BaseXform {
  model: any;

  get tag() {
    return 'drawing';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (model) {
      xmlStream.leafNode(this.tag, {'r:id': model.rId});
    }
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case this.tag:
        this.model = {
          rId: node.attributes['r:id'],
        };
        return true;
      default:
        return false;
    }
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default DrawingXform;
