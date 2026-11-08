import BaseXform, { type XformModel, type XmlNode } from "../../base-xform";
import XmlStream from "../../../../utils/xml-stream";

class VmlProtectionXform extends BaseXform {
  _model: any;
  text: any;

  constructor(model) {
    super();
    this._model = model;
  }

  get tag() {
    return this._model && this._model.tag;
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, null, model);
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case this.tag:
        this.text = '';
        return true;
      default:
        return false;
    }
  }

  parseText(text: string) {
    this.text = text;
  }

  parseClose() {
    return false;
  }
}

export default VmlProtectionXform;
