const Sql = require('../Sql');

class ForShare extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  getText() {
    const value = this.formatValue();

    return value ? `FOR SHARE ${value}` : 'FOR SHARE';
  }
}

module.exports = ForShare;
