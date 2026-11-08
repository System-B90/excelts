import TextXform from "./text-xform";
import RichTextXform from "./rich-text-xform";
import PhoneticTextXform from "./phonetic-text-xform";

import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

// <si>
//   <r></r><r></r>...
// </si>
// <si>
//   <t></t>
// </si>

class SharedStringXform extends BaseXform {
  model: any;
  map: any;
  parser: any;

  constructor(model?) {
    super();

    this.model = model;

    this.map = {
      r: new RichTextXform(),
      t: new TextXform(),
      rPh: new PhoneticTextXform(),
    };
  }

  get tag() {
    return 'si';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode(this.tag);
    if (model && model.hasOwnProperty('richText') && model.richText) {
      if (model.richText.length) {
        model.richText.forEach(text => {
          this.map.r.render(xmlStream, text);
        });
      } else {
        this.map.t.render(xmlStream, '');
      }
    } else if (model !== undefined && model !== null) {
      this.map.t.render(xmlStream, model);
    }
    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    const {name} = node;
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    if (name === this.tag) {
      this.model = {};
      return true;
    }
    this.parser = this.map[name];
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    return false;
  }

  parseText(text: string) {
    if (this.parser) {
      this.parser.parseText(text);
    }
  }

  parseClose(name: string) {
    if (this.parser) {
      if (!this.parser.parseClose(name)) {
        switch (name) {
          case 'r': {
            let rt = this.model.richText;
            if (!rt) {
              rt = this.model.richText = [];
            }
            rt.push(this.parser.model);
            break;
          }
          case 't':
            this.model = this.parser.model;
            break;
          default:
            break;
        }
        this.parser = undefined;
      }
      return true;
    }
    switch (name) {
      case this.tag:
        return false;
      default:
        return true;
    }
  }
}

export default SharedStringXform;
