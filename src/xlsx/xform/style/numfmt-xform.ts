import * as _ from "../../../utils/under-dash";
import defaultNumFormats from "../../defaultnumformats";

import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

function hashDefaultFormats() {
  const hash = {};
  _.each(defaultNumFormats, (dnf, id) => {
    if (dnf.f) {
      hash[dnf.f] = parseInt(id, 10);
    }
    // at some point, add the other cultures here...
  });
  return hash;
}
const defaultFmtHash = hashDefaultFormats();

// NumFmt encapsulates translation between number format and xlsx
class NumFmtXform extends BaseXform {
  static getDefaultFmtCode = function getDefaultFmtCode(numFmtId: any) {
    return defaultNumFormats[numFmtId] && defaultNumFormats[numFmtId].f;
  };

  static getDefaultFmtId = function getDefaultFmtId(formatCode: any) {
    return defaultFmtHash[formatCode];
  };

  id: any;
  formatCode: any;
  model: any;

  constructor(id?: any, formatCode?: any) {
    super();

    this.id = id;
    this.formatCode = formatCode;
  }

  get tag() {
    return 'numFmt';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode('numFmt', {numFmtId: model.id, formatCode: model.formatCode});
  }

  parseOpen(node: XmlNode) {
    switch (node.name) {
      case 'numFmt':
        this.model = {
          id: parseInt(node.attributes.numFmtId, 10),
          formatCode: node.attributes.formatCode.replace(/[\\](.)/g, '$1'),
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

export default NumFmtXform;
