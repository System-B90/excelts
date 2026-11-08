import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class AppHeadingPairsXform extends BaseXform {
  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode('HeadingPairs');
    xmlStream.openNode('vt:vector', {size: 2, baseType: 'variant'});

    xmlStream.openNode('vt:variant');
    xmlStream.leafNode('vt:lpstr', undefined, 'Worksheets');
    xmlStream.closeNode();

    xmlStream.openNode('vt:variant');
    xmlStream.leafNode('vt:i4', undefined, model.length);
    xmlStream.closeNode();

    xmlStream.closeNode();
    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    // no parsing
    return node.name === 'HeadingPairs';
  }

  parseText() {}

  parseClose(name: string) {
    return name !== 'HeadingPairs';
  }
}

export default AppHeadingPairsXform;
