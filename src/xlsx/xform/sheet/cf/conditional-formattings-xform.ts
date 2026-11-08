import BaseXform, { type XformModel, type XformOptions, type XmlNode } from "../../base-xform";
import XmlStream from "../../../../utils/xml-stream";

import ConditionalFormattingXform from "./conditional-formatting-xform";

class ConditionalFormattingsXform extends BaseXform {
  cfXform: any;
  model: any;
  parser: any;

  constructor() {
    super();

    this.cfXform = new ConditionalFormattingXform();
  }

  get tag() {
    return 'conditionalFormatting';
  }

  reset() {
    this.model = [];
  }

  prepare(model: XformModel, options: XformOptions) {
    // ensure each rule has a priority value
    let nextPriority = model.reduce(
      (p: any, cf: any) => Math.max(p, ...cf.rules.map((rule: any) => rule.priority || 0)),
      1
    );
    model.forEach((cf: any) => {
      cf.rules.forEach((rule: any) => {
        if (!rule.priority) {
          rule.priority = nextPriority++;
        }

        if (rule.style) {
          rule.dxfId = options.styles.addDxfStyle(rule.style);
        }
      });
    });
  }

  render(xmlStream: XmlStream, model: XformModel) {
    model.forEach((cf: any) => {
      this.cfXform.render(xmlStream, cf);
    });
  }

  parseOpen(node: XmlNode) {
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }

    switch (node.name) {
      case 'conditionalFormatting':
        this.parser = this.cfXform;
        this.parser.parseOpen(node);
        return true;

      default:
        return false;
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
        return false;
      }
      return true;
    }
    return false;
  }

  reconcile(model: XformModel, options: XformOptions) {
    model.forEach((cf: any) => {
      cf.rules.forEach((rule: any) => {
        if (rule.dxfId !== undefined) {
          rule.style = options.styles.getDxfStyle(rule.dxfId);
          delete rule.dxfId;
        }
      });
    });
  }
}

export default ConditionalFormattingsXform;
