const Sql = require('../Sql');

class Having extends Sql {
  formatValue() {
    return this.formatConditionExpressions(this.getValue());
  }

  formatText() {
    return `HAVING ${this.formatValue()}`;
  }
}

module.exports = Having;
