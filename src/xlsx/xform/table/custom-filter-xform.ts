import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class CustomFilterXform extends BaseXform {
  model: any;

  get tag() {
    return 'customFilter';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, {
      val: model.val,
      operator: model.operator,
    });
  }

  parseOpen(node: XmlNode) {
    if (node.name === this.tag) {
      this.model = {
        val: node.attributes.val,
        operator: node.attributes.operator,
      };
      return true;
    }
    return false;
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default CustomFilterXform;
