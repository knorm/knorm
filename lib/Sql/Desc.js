const Sql = require('../Sql');

class Desc extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  getText() {
    const value = this.formatValue();

    return value ? `DESC ${value}` : 'DESC';
  }
}

module.exports = Desc;
