const Sql = require('../Sql');

class Desc extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  formatText() {
    const value = this.formatValue();

    return value ? `DESC ${value}` : 'DESC';
  }
}

module.exports = Desc;
