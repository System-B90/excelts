import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

/** https://en.wikipedia.org/wiki/Office_Open_XML_file_formats#DrawingML */
const EMU_PER_PIXEL_AT_96_DPI = 9525;

class ExtXform extends BaseXform {
  tag: any;
  map: any;
  model: any;

  constructor(options) {
    super();

    this.tag = options.tag;
    this.map = {};
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode(this.tag);

    const width = Math.floor(model.width * EMU_PER_PIXEL_AT_96_DPI);
    const height = Math.floor(model.height * EMU_PER_PIXEL_AT_96_DPI);

    xmlStream.addAttribute('cx', width);
    xmlStream.addAttribute('cy', height);

    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    if (node.name === this.tag) {
      this.model = {
        width: parseInt(node.attributes.cx || '0', 10) / EMU_PER_PIXEL_AT_96_DPI,
        height: parseInt(node.attributes.cy || '0', 10) / EMU_PER_PIXEL_AT_96_DPI,
      };
      return true;
    }
    return false;
  }

  parseText(/* text */) {}

  parseClose(/* name */) {
    return false;
  }
}

export default ExtXform;
