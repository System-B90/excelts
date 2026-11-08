import BaseXform, { type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class ExtLstXform extends BaseXform {
  get tag() {
    return 'a:extLst';
  }

  render(xmlStream: XmlStream) {
    xmlStream.openNode(this.tag);
    xmlStream.openNode('a:ext', {
      uri: '{FF2B5EF4-FFF2-40B4-BE49-F238E27FC236}',
    });
    xmlStream.leafNode('a16:creationId', {
      'xmlns:a16': 'http://schemas.microsoft.com/office/drawing/2014/main',
      id: '{00000000-0008-0000-0000-000002000000}',
    });
    xmlStream.closeNode();
    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case this.tag:
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

export default ExtLstXform;
