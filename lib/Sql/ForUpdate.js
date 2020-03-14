const Sql = require('../Sql');

class ForUpdate extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  getText() {
    const value = this.formatValue();

    return value ? `FOR UPDATE ${value}` : 'FOR UPDATE';
  }
}

module.exports = ForUpdate;
