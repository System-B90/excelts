import BaseXform, { type XformModel, type XformOptions, type XmlNode } from "./base-xform";
import XmlStream from "../../utils/xml-stream";

class ListXform extends BaseXform {
  tag: any;
  /** Attributes for the list's own element. */
  $: any;
  /** Name of the attribute that carries the item count. */
  $count: string;
  always: any;
  count: any;
  empty: any;
  childXform: any;
  maxItems: any;
  model: any;
  parser: any;

  constructor(options: any) {
    super();

    this.tag = options.tag;
    this.always = !!options.always;
    this.count = options.count;
    this.empty = options.empty;
    this.$count = options.$count || 'count';
    this.$ = options.$;
    this.childXform = options.childXform;
    this.maxItems = options.maxItems;
  }

  prepare(model: XformModel, options: XformOptions) {
    const {childXform} = this;
    if (model) {
      model.forEach((childModel: any, index: any) => {
        options.index = index;
        childXform.prepare(childModel, options);
      });
    }
  }

  render(xmlStream: XmlStream, model: XformModel) {
    if (this.always || (model && model.length)) {
      xmlStream.openNode(this.tag, this.$);
      if (this.count) {
        xmlStream.addAttribute(this.$count, (model && model.length) || 0);
      }

      const {childXform} = this;
      (model || []).forEach((childModel: any, index: any) => {
        childXform.render(xmlStream, childModel, index);
      });

      xmlStream.closeNode();
    } else if (this.empty) {
      xmlStream.leafNode(this.tag);
    }
  }

  parseOpen(node: XmlNode) {
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    switch (node.name) {
      case this.tag:
        this.model = [];
        return true;
      default:
        if (this.childXform.parseOpen(node)) {
          this.parser = this.childXform;
          return true;
        }
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

        if (this.maxItems && this.model.length > this.maxItems) {
          throw new Error(`Max ${this.childXform.tag} count (${this.maxItems}) exceeded`);
        }
      }
      return true;
    }

    return false;
  }

  reconcile(model: XformModel, options: XformOptions) {
    if (model) {
      const {childXform} = this;
      model.forEach((childModel: any) => {
        childXform.reconcile(childModel, options);
      });
    }
  }
}

export default ListXform;
