import colCache from "../../../utils/col-cache";
import BaseXform, { type XformModel, type XmlNode } from "../base-xform";
import XmlStream from "../../../utils/xml-stream";

class AutoFilterXform extends BaseXform {
  model: any;

  get tag() {
    return 'autoFilter';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (model) {
      if (typeof model === 'string') {
        // assume range
        xmlStream.leafNode('autoFilter', {ref: model});
      } else {
        const getAddress = function(addr) {
          if (typeof addr === 'string') {
            return addr;
          }
          return colCache.getAddress(addr.row, addr.column).address;
        };

        const firstAddress = getAddress(model.from);
        const secondAddress = getAddress(model.to);
        if (firstAddress && secondAddress) {
          xmlStream.leafNode('autoFilter', {ref: `${firstAddress}:${secondAddress}`});
        }
      }
    }
  }

  parseOpen(node: XmlNode) {
    if (node.name === 'autoFilter') {
      this.model = node.attributes.ref;
    }
  }
}

export default AutoFilterXform;
