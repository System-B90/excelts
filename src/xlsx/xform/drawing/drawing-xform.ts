import colCache from "../../../utils/col-cache";
import XmlStream from "../../../utils/xml-stream";

import BaseXform, { type XformModel, type XformOptions, type XmlNode } from "../base-xform";
import TwoCellAnchorXform from "./two-cell-anchor-xform";
import OneCellAnchorXform from "./one-cell-anchor-xform";

function getAnchorType(model: any) {
  const range = typeof model.range === 'string' ? colCache.decode(model.range) : model.range;

  return range.br ? 'xdr:twoCellAnchor' : 'xdr:oneCellAnchor';
}

class DrawingXform extends BaseXform {
  static DRAWING_ATTRIBUTES = {
    'xmlns:xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
  };

  map: any;
  model: any;
  parser: any;

  constructor() {
    super();

    this.map = {
      'xdr:twoCellAnchor': new TwoCellAnchorXform(),
      'xdr:oneCellAnchor': new OneCellAnchorXform(),
    };
  }

  prepare(model: XformModel) {
    model.anchors.forEach((item: any, index: any) => {
      item.anchorType = getAnchorType(item);
      const anchor = this.map[item.anchorType];
      anchor.prepare(item, {index});
    });
  }

  get tag() {
    return 'xdr:wsDr';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openXml(XmlStream.StdDocAttributes);
    xmlStream.openNode(this.tag, DrawingXform.DRAWING_ATTRIBUTES);

    model.anchors.forEach((item: any) => {
      const anchor = this.map[item.anchorType];
      anchor.render(xmlStream, item);
    });

    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    switch (node.name) {
      case this.tag:
        this.reset();
        this.model = {
          anchors: [],
        };
        break;
      default:
        this.parser = this.map[node.name];
        if (this.parser) {
          this.parser.parseOpen(node);
        }
        break;
    }
    return true;
  }

  parseText(text: string) {
    if (this.parser) {
      this.parser.parseText(text);
    }
  }

  parseClose(name: string) {
    if (this.parser) {
      if (!this.parser.parseClose(name)) {
        this.model.anchors.push(this.parser.model);
        this.parser = undefined;
      }
      return true;
    }
    switch (name) {
      case this.tag:
        return false;
      default:
        // could be some unrecognised tags
        return true;
    }
  }

  reconcile(model: XformModel, options: XformOptions) {
    model.anchors.forEach((anchor: any) => {
      if (anchor.br) {
        this.map['xdr:twoCellAnchor'].reconcile(anchor, options);
      } else {
        this.map['xdr:oneCellAnchor'].reconcile(anchor, options);
      }
    });
  }
}

export default DrawingXform;
