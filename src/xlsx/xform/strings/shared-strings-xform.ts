import XmlStream from "../../../utils/xml-stream";
import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import SharedStringXform from "./shared-string-xform";

class SharedStringsXform extends BaseXform {
  model: any;
  hash: any;
  rich: any;
  _sharedStringXform: any;
  parser: any;

  constructor(model?: any) {
    super();

    this.model = model || {
      values: [],
      count: 0,
    };
    this.hash = Object.create(null);
    this.rich = Object.create(null);
  }

  get sharedStringXform() {
    return this._sharedStringXform || (this._sharedStringXform = new SharedStringXform());
  }

  get values() {
    return this.model.values;
  }

  get uniqueCount() {
    return this.model.values.length;
  }

  get count() {
    return this.model.count;
  }

  getString(index: any) {
    return this.model.values[index];
  }

  add(value: any) {
    return value.richText ? this.addRichText(value) : this.addText(value);
  }

  addText(value: any) {
    let index = this.hash[value];
    if (index === undefined) {
      index = this.hash[value] = this.model.values.length;
      this.model.values.push(value);
    }
    this.model.count++;
    return index;
  }

  addRichText(value: any) {
    // TODO: add WeakMap here
    const xml = this.sharedStringXform.toXml(value);
    let index = this.rich[xml];
    if (index === undefined) {
      index = this.rich[xml] = this.model.values.length;
      this.model.values.push(value);
    }
    this.model.count++;
    return index;
  }

  // <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  // <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="<%=totalRefs%>" uniqueCount="<%=count%>">
  //   <si><t><%=text%></t></si>
  //   <si><r><rPr></rPr><t></t></r></si>
  // </sst>

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openXml(XmlStream.StdDocAttributes);

    xmlStream.openNode('sst', {
      xmlns: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      count: model.count,
      uniqueCount: model.values.length,
    });

    const sx = this.sharedStringXform;
    model.values.forEach((sharedString: any) => {
      sx.render(xmlStream, sharedString);
    });
    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    switch (node.name) {
      case 'sst':
        return true;
      case 'si':
        this.parser = this.sharedStringXform;
        this.parser.parseOpen(node);
        return true;
      default:
        throw new Error(`Unexpected xml node in parseOpen: ${JSON.stringify(node)}`);
    }
  }

  parseText(text: string) {
    if (this.parser) {
      this.parser.parseText(text);
    }
  }

  parseClose(name: string) {
    if (this.parser) {
      if (!this.parser.parseClose(name)) {
        this.model.values.push(this.parser.model);
        this.model.count++;
        this.parser = undefined;
      }
      return true;
    }
    switch (name) {
      case 'sst':
        return false;
      default:
        throw new Error(`Unexpected xml node in parseClose: ${name}`);
    }
  }
}

export default SharedStringsXform;
