import parseSax from "../../utils/parse-sax";
import XmlStream from "../../utils/xml-stream";

/** An opening tag, as the SAX parser reports it. */
export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
}

/**
 * What an xform reads and writes: a plain-data model whose shape is private to
 * each xform (a boolean for one, a nested object for another). It is the
 * boundary between the workbook's objects and the file's XML, so it is
 * deliberately untyped here and typed by each xform's own parsing and rendering.
 */
export type XformModel = any;

/** Per-run state handed to `prepare` and `reconcile`: the shared styles, strings, media and so on. */
export type XformOptions = any;

/** An xform, or the wrapper some xforms use around theirs. */
export type XformEntry = BaseXform | { xform: BaseXform };

/* 'virtual' methods used as a form of documentation */
/* eslint-disable class-methods-use-this */

// Base class for Xforms
class BaseXform {
  model: XformModel;

  /** Child xforms by tag or role, reset together with this one. */
  map?: Record<string, XformEntry>;

  // constructor(/* model, name */) {}

  // ============================================================
  // Virtual Interface

  /** Optional preparation (mutation) of the model so it is ready for write. */
  prepare(_model?: XformModel, _options?: XformOptions): void {}

  /** Converts the model to XML. */
  render(_xmlStream: XmlStream, _model?: XformModel): void {}

  /** An XML node opened. Returns whether this xform took it. */
  parseOpen(_node: XmlNode): boolean | void {}

  /** A chunk of text in the current node. */
  parseText(_text: string): void {}

  /** An XML node closed. Returns whether this xform is still parsing. */
  parseClose(_name: string): boolean {
    return false;
  }

  /** Optional post-parse step (the opposite of `prepare`). */
  reconcile(_model?: XformModel, _options?: XformOptions): void {}

  // ============================================================
  reset() {
    // to make sure parses don't bleed to next iteration
    this.model = null;

    // if we have a map - reset them too
    if (this.map) {
      Object.values(this.map).forEach(entry => {
        if (entry instanceof BaseXform) {
          entry.reset();
        } else if (entry.xform) {
          entry.xform.reset();
        }
      });
    }
  }

  mergeModel(obj: object) {
    // set obj's props to this.model
    this.model = Object.assign(this.model || {}, obj);
  }

  async parse(saxParser: AsyncIterable<any>) {
    for await (const events of saxParser) {
      for (const {eventType, value} of events) {
        if (eventType === 'opentag') {
          this.parseOpen(value);
        } else if (eventType === 'text') {
          this.parseText(value);
        } else if (eventType === 'closetag') {
          if (!this.parseClose(value.name)) {
            return this.model;
          }
        }
      }
    }
    return this.model;
  }

  async parseStream(stream: any) {
    return this.parse(parseSax(stream));
  }

  get xml() {
    // convenience function to get the xml of this.model
    // useful for manager types that are built during the prepare phase
    return this.toXml(this.model);
  }

  toXml(model: XformModel): string {
    const xmlStream = new XmlStream();
    this.render(xmlStream, model);
    return xmlStream.xml;
  }

  // ============================================================
  // Useful Utilities
  static toAttribute(value: any, dflt: any, always = false) {
    if (value === undefined) {
      if (always) {
        return dflt;
      }
    } else if (always || value !== dflt) {
      return value.toString();
    }
    return undefined;
  }

  static toStringAttribute(value: any, dflt?: any, always = false) {
    return BaseXform.toAttribute(value, dflt, always);
  }

  static toStringValue(attr: string | undefined, dflt?: any) {
    return attr === undefined ? dflt : attr;
  }

  static toBoolAttribute(value: any, dflt?: any, always = false) {
    if (value === undefined) {
      if (always) {
        return dflt;
      }
    } else if (always || value !== dflt) {
      return value ? '1' : '0';
    }
    return undefined;
  }

  static toBoolValue(attr: string | undefined, dflt?: any) {
    return attr === undefined ? dflt : attr === '1';
  }

  static toIntAttribute(value: any, dflt?: any, always = false) {
    return BaseXform.toAttribute(value, dflt, always);
  }

  static toIntValue(attr: string | undefined, dflt?: any) {
    return attr === undefined ? dflt : parseInt(attr, 10);
  }

  static toFloatAttribute(value: any, dflt?: any, always = false) {
    return BaseXform.toAttribute(value, dflt, always);
  }

  static toFloatValue(attr: string | undefined, dflt?: any) {
    return attr === undefined ? dflt : parseFloat(attr);
  }
}

export default BaseXform;
