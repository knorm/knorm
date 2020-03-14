const Sql = require('../Sql');

class Into extends Sql {
  formatValue() {
    return this.formatExpression(this.getValue());
  }

  getText() {
    return `INTO ${this.formatValue()}`;
  }
}

module.exports = Into;
