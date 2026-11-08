import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class RelationshipXform extends BaseXform {
  model: any;

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode('Relationship', model);
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case 'Relationship':
        this.model = node.attributes;
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

export default RelationshipXform;
