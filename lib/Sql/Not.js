const Sql = require('../Sql');

class Not extends Sql {
  formatValue() {
    return this.formatExpression(this.getValue());
  }

  formatText() {
    return `NOT ${this.formatValue()}`;
  }
}

module.exports = Not;
