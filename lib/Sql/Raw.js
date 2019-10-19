const Sql = require('../Sql');

class Raw extends Sql {
  formatValue() {
    return this.getValue();
  }

  formatText() {
    return this.getValue().text;
  }

  getValues() {
    return this.getValue().values;
  }
}

module.exports = Raw;
