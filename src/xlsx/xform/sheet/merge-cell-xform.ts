import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class MergeCellXform extends BaseXform {
  model: any;

  get tag() {
    return 'mergeCell';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode('mergeCell', {ref: model});
  }

  parseOpen(node: XmlNode) {
    if (node.name === 'mergeCell') {
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

export default MergeCellXform;
