import * as _ from "../../../utils/under-dash";
import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

function booleanToXml(model: any) {
  return model ? '1' : undefined;
}

class PrintOptionsXform extends BaseXform {
  model: any;

  get tag() {
    return 'printOptions';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (model) {
      const attributes = {
        headings: booleanToXml(model.showRowColHeaders),
        gridLines: booleanToXml(model.showGridLines),
        horizontalCentered: booleanToXml(model.horizontalCentered),
        verticalCentered: booleanToXml(model.verticalCentered),
      };
      if (_.some(attributes, value => value !== undefined)) {
        xmlStream.leafNode(this.tag, attributes);
      }
    }
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case this.tag:
        this.model = {
          showRowColHeaders: node.attributes.headings === '1',
          showGridLines: node.attributes.gridLines === '1',
          horizontalCentered: node.attributes.horizontalCentered === '1',
          verticalCentered: node.attributes.verticalCentered === '1',
        };
        return true;
      default:
        return false;
    }
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default PrintOptionsXform;
