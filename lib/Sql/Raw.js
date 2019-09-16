const Sql = require('../Sql');

class Raw extends Sql {
  getText() {
    return this.value.text;
  }

  getValues() {
    return this.value.values;
  }

  format() {
    return this.value;
  }
}

module.exports = Raw;
