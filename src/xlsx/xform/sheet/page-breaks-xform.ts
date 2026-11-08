import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class PageBreaksXform extends BaseXform {
  model: any;

  get tag() {
    return 'brk';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode('brk', model);
  }

  parseOpen(node: XmlNode) {
    if (node.name === 'brk') {
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

export default PageBreaksXform;
