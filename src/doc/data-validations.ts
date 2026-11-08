class DataValidations {
  model: any;

  constructor(model?: any) {
    this.model = model || {};
  }

  add(address: any, validation: any) {
    return (this.model[address] = validation);
  }

  find(address: any) {
    return this.model[address];
  }

  remove(address: any) {
    this.model[address] = undefined;
  }
}

export default DataValidations;
