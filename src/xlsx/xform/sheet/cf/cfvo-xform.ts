import BaseXform, { type XformModel, type XmlNode } from "../../base-xform";
import XmlStream from "../../../../utils/xml-stream";

class CfvoXform extends BaseXform {
  model: any;

  get tag() {
    return 'cfvo';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, {
      type: model.type,
      val: model.value,
    });
  }

  parseOpen(node: XmlNode) {
    this.model = {
      type: node.attributes.type,
      value: BaseXform.toFloatValue(node.attributes.val),
    };
  }

  parseClose(name: string) {
    return name !== this.tag;
  }
}

export default CfvoXform;
