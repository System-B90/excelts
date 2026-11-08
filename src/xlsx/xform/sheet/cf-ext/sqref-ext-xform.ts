import BaseXform, { type XformModel } from "../../base-xform";
import XmlStream from "../../../../utils/xml-stream";

class SqrefExtXform extends BaseXform {
  model: any;

  get tag() {
    return 'xm:sqref';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, null, model);
  }

  parseOpen() {
    this.model = '';
  }

  parseText(text: string) {
    this.model += text;
  }

  parseClose(name: string) {
    return name !== this.tag;
  }
}

export default SqrefExtXform;
