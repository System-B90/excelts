import BaseXform, { type XformModel } from "../../base-xform";
import XmlStream from "../../../../utils/xml-stream";

class CfIconExtXform extends BaseXform {
  model: any;

  get tag() {
    return 'x14:cfIcon';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.leafNode(this.tag, {
      iconSet: model.iconSet,
      iconId: model.iconId,
    });
  }

  parseOpen({attributes}: any) {
    this.model = {
      iconSet: attributes.iconSet,
      iconId: BaseXform.toIntValue(attributes.iconId),
    };
  }

  parseClose(name: string) {
    return name !== this.tag;
  }
}

export default CfIconExtXform;
