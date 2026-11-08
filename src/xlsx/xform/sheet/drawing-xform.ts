import BaseXform from "../base-xform";

class DrawingXform extends BaseXform {
  model: any;

  get tag() {
    return 'drawing';
  }

  render(xmlStream, model) {
    if (model) {
      xmlStream.leafNode(this.tag, {'r:id': model.rId});
    }
  }

  parseOpen(node) {
    switch (node.name) {
      case this.tag:
        this.model = {
          rId: node.attributes['r:id'],
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

export default DrawingXform;
