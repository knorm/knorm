const Sql = require('../Sql');

class ForUpdate extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  formatText() {
    const value = this.formatValue();

    return value ? `FOR UPDATE ${value}` : 'FOR UPDATE';
  }
}

module.exports = ForUpdate;
