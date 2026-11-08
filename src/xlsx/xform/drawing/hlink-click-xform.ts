import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class HLinkClickXform extends BaseXform {
  model: any;

  get tag() {
    return 'a:hlinkClick';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (!(model.hyperlinks && model.hyperlinks.rId)) {
      return;
    }
    xmlStream.leafNode(this.tag, {
      'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'r:id': model.hyperlinks.rId,
      tooltip: model.hyperlinks.tooltip,
    });
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case this.tag:
        this.model = {
          hyperlinks: {
            rId: node.attributes['r:id'],
            tooltip: node.attributes.tooltip,
          },
        };
        return true;
      default:
        return true;
    }
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default HLinkClickXform;
