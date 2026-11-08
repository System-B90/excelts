import BaseXform, { type XformModel, type XformOptions, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class TableColumnXform extends BaseXform {
  model: any;

  get tag() {
    return 'tableColumn';
  }

  prepare(model: XformModel, options: XformOptions) {
    model.id = options.index + 1;
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, {
      id: model.id.toString(),
      name: model.name,
      totalsRowLabel: model.totalsRowLabel,
      totalsRowFunction: model.totalsRowFunction,
      dxfId: model.dxfId,
    });
    return true;
  }

  parseOpen(node: XmlNode) {
    if (node.name === this.tag) {
      const {attributes} = node;
      this.model = {
        name: attributes.name,
        totalsRowLabel: attributes.totalsRowLabel,
        totalsRowFunction: attributes.totalsRowFunction,
        dxfId: attributes.dxfId,
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

export default TableColumnXform;
