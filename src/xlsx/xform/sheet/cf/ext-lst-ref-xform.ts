/* eslint-disable max-classes-per-file */
import BaseXform, { type XformModel } from "../../base-xform";
import XmlStream from "../../../../utils/xml-stream";
import CompositeXform from "../../composite-xform";

class X14IdXform extends BaseXform {
  model: any;

  get tag() {
    return 'x14:id';
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

class ExtXform extends CompositeXform {
  map: any;
  idXform: any;

  constructor() {
    super();

    this.map = {
      'x14:id': (this.idXform = new X14IdXform()),
    };
  }

  get tag() {
    return 'ext';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode(this.tag, {
      uri: '{B025F937-C7B1-47D3-B67F-A62EFF666E3E}',
      'xmlns:x14': 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main',
    });

    this.idXform.render(xmlStream, model.x14Id);

    xmlStream.closeNode();
  }

  createNewModel() {
    return {};
  }

  onParserClose(name, parser) {
    this.model.x14Id = parser.model;
  }
}

class ExtLstRefXform extends CompositeXform {
  map: any;

  constructor() {
    super();
    this.map = {
      ext: new ExtXform(),
    };
  }

  get tag() {
    return 'extLst';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode(this.tag);
    this.map.ext.render(xmlStream, model);
    xmlStream.closeNode();
  }

  createNewModel() {
    return {};
  }

  onParserClose(name, parser) {
    Object.assign(this.model, parser.model);
  }
}

export default ExtLstRefXform;
