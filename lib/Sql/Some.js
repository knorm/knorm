const Sql = require('../Sql');

class Some extends Sql {
  formatValue() {
    return this.formatExpression(this.getValue());
  }

  getText() {
    return `SOME ${this.formatValue()}`;
  }
}

module.exports = Some;
