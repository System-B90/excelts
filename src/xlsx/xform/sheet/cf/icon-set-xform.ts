import BaseXform, { type XformModel } from "../../base-xform";
import XmlStream from "../../../../utils/xml-stream";
import CompositeXform from "../../composite-xform";

import CfvoXform from "./cfvo-xform";

class IconSetXform extends CompositeXform {
  map: any;
  cfvoXform: any;

  constructor() {
    super();

    this.map = {
      cfvo: (this.cfvoXform = new CfvoXform()),
    };
  }

  get tag() {
    return 'iconSet';
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openNode(this.tag, {
      iconSet: BaseXform.toStringAttribute(model.iconSet, '3TrafficLights'),
      reverse: BaseXform.toBoolAttribute(model.reverse, false),
      showValue: BaseXform.toBoolAttribute(model.showValue, true),
    });

    model.cfvo.forEach(cfvo => {
      this.cfvoXform.render(xmlStream, cfvo);
    });

    xmlStream.closeNode();
  }

  createNewModel({attributes}) {
    return {
      iconSet: BaseXform.toStringValue(attributes.iconSet, '3TrafficLights'),
      reverse: BaseXform.toBoolValue(attributes.reverse),
      showValue: BaseXform.toBoolValue(attributes.showValue),
      cfvo: [],
    };
  }

  onParserClose(name, parser) {
    this.model[name].push(parser.model);
  }
}

export default IconSetXform;
