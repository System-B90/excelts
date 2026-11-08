import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class BlipXform extends BaseXform {
  model: any;

  get tag() {
    return 'a:blip';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, {
      'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'r:embed': model.rId,
      cstate: 'print',
    });
    // TODO: handle children (e.g. a:extLst=>a:ext=>a14:useLocalDpi
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case this.tag:
        this.model = {
          rId: node.attributes['r:embed'],
        };
        return true;
      default:
        return true;
    }
  }

  parseText() {}

  parseClose(name: string) {
    switch (name) {
      case this.tag:
        return false;
      default:
        // unprocessed internal nodes
        return true;
    }
  }
}

export default BlipXform;
