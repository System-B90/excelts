import BaseXform from "../base-xform";

class WorkbookCalcPropertiesXform extends BaseXform {
  model: any;

  render(xmlStream, model) {
    xmlStream.leafNode('calcPr', {
      calcId: 171027,
      fullCalcOnLoad: model.fullCalcOnLoad ? 1 : undefined,
    });
  }

  parseOpen(node) {
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
