import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class WorkbookCalcPropertiesXform extends BaseXform {
  model: any;

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode('calcPr', {
      calcId: 171027,
      fullCalcOnLoad: model.fullCalcOnLoad ? 1 : undefined,
    });
  }

  parseOpen(node: XmlNode) {
    if (node.name === 'calcPr') {
      this.model = {};
      return true;
    }
    return false;
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

export default WorkbookCalcPropertiesXform;
