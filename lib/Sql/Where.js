const Sql = require('../Sql');

class Where extends Sql {
  formatValue() {
    return this.formatConditionExpressions(this.getValue());
  }

  getText() {
    return `WHERE ${this.formatValue()}`;
  }
}

module.exports = Where;
