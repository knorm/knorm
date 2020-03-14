const Sql = require('../Sql');

class Distinct extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  getText() {
    const value = this.formatValue();

    return value ? `DISTINCT ${value}` : 'DISTINCT';
  }
}

module.exports = Distinct;
