import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class DateXform extends BaseXform {
  tag: any;
  attr: any;
  attrs: any;
  _format: any;
  _parse: any;
  model: any;
  text: any;

  constructor(options: any) {
    super();

    this.tag = options.tag;
    this.attr = options.attr;
    this.attrs = options.attrs;
    this._format =
      options.format ||
      function(dt: any) {
        try {
          if (Number.isNaN(dt.getTime())) return '';
          return dt.toISOString();
        } catch (e) {
          return '';
        }
      };
    this._parse =
      options.parse ||
      function(str: any) {
        return new Date(str);
      };
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (model) {
      xmlStream.openNode(this.tag);
      if (this.attrs) {
        xmlStream.addAttributes(this.attrs);
      }
      if (this.attr) {
        xmlStream.addAttribute(this.attr, this._format(model));
      } else {
        xmlStream.writeText(this._format(model));
      }
      xmlStream.closeNode();
    }
  }

  parseOpen(node: XmlNode) {
    if (node.name === this.tag) {
      if (this.attr) {
        this.model = this._parse(node.attributes[this.attr]);
      } else {
        this.text = [];
      }
    }
  }

  parseText(text: string) {
    if (!this.attr) {
      this.text.push(text);
    }
  }

  parseClose() {
    if (!this.attr) {
      this.model = this._parse(this.text.join(''));
    }
    return false;
  }
}

export default DateXform;
