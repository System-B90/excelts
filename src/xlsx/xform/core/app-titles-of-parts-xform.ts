import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class AppTitlesOfPartsXform extends BaseXform {
  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode('TitlesOfParts');
    xmlStream.openNode('vt:vector', {size: model.length, baseType: 'lpstr'});

    model.forEach(sheet => {
      xmlStream.leafNode('vt:lpstr', undefined, sheet.name);
    });

    xmlStream.closeNode();
    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    // no parsing
    return node.name === 'TitlesOfParts';
  }

  parseText() {}

  parseClose(name: string) {
    return name !== 'TitlesOfParts';
  }
}

export default AppTitlesOfPartsXform;
