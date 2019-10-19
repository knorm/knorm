const Sql = require('../Sql');

class All extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  formatText() {
    const value = this.formatValue();

    return value ? `ALL ${value}` : 'ALL';
  }
}

module.exports = All;
