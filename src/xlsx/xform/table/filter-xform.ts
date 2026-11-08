import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class FilterXform extends BaseXform {
  model: any;

  get tag() {
    return 'filter';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, {
      val: model.val,
    });
  }

  parseOpen(node: XmlNode) {
    if (node.name === this.tag) {
      this.model = {
        val: node.attributes.val,
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

export default FilterXform;
