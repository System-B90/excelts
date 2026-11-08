'use strict';

import XLSX from "../xlsx/xlsx";

class ModelContainer {
  model: any;
  _xlsx: any;

  constructor(model) {
    this.model = model;
  }

  get xlsx() {
    if (!this._xlsx) {
      this._xlsx = new XLSX(this);
    }
    return this._xlsx;
  }
}

export default ModelContainer;
