const Sql = require('../Sql');

class Some extends Sql {
  formatValue() {
    return this.formatExpression(this.getValue());
  }

  formatText() {
    return `SOME ${this.formatValue()}`;
  }
}

module.exports = Some;
