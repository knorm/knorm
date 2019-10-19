const Sql = require('../Sql');

class Limit extends Sql {
  formatValue() {
    return this.formatIntegerExpression(this.getValue());
  }

  formatText() {
    return `LIMIT ${this.formatValue()}`;
  }
}

module.exports = Limit;
