const Sql = require('../Sql');

class All extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  getText() {
    const value = this.formatValue();

    return value ? `ALL ${value}` : 'ALL';
  }
}

module.exports = All;
