const Sql = require('../Sql');

class Asc extends Sql {
  formatValue() {
    return this.formatTrueOrOtherExpression(this.getValue());
  }

  formatText() {
    const value = this.formatValue();

    return value ? `ASC ${value}` : 'ASC';
  }
}

module.exports = Asc;
