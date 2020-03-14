const Sql = require('../Sql');

class Any extends Sql {
  formatValue() {
    return this.formatExpression(this.getValue());
  }

  getText() {
    return `ANY ${this.formatValue()}`;
  }
}

module.exports = Any;
