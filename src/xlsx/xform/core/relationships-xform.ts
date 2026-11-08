import XmlStream from "../../../utils/xml-stream";
import BaseXform, { type XformModel, type XmlNode } from "../base-xform";

import RelationshipXform from "./relationship-xform";

class RelationshipsXform extends BaseXform {
  static RELATIONSHIPS_ATTRIBUTES = {
    xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships',
  };

  map: any;
  model: any;
  parser: any;

  constructor() {
    super();

    this.map = {
      Relationship: new RelationshipXform(),
    };
  }

  render(xmlStream: XmlStream, model: XformModel) {
    xmlStream.openXml(XmlStream.StdDocAttributes);
    xmlStream.openNode('Relationships', RelationshipsXform.RELATIONSHIPS_ATTRIBUTES);

    model.forEach((relationship: any) => {
      this.map.Relationship.render(xmlStream, relationship);
    });

    xmlStream.closeNode();
  }

  parseOpen(node: XmlNode) {
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    switch (node.name) {
      case 'Relationships':
        this.model = [];
        return true;
      default:
        this.parser = this.map[node.name];
        if (this.parser) {
          this.parser.parseOpen(node);
          return true;
        }
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
        this.model.push(this.parser.model);
        this.parser = undefined;
      }
      return true;
    }
    switch (name) {
      case 'Relationships':
        return false;
      default:
        throw new Error(`Unexpected xml node in parseClose: ${name}`);
    }
  }
}

export default RelationshipsXform;
