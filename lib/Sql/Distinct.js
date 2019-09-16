const Sql = require('../Sql');

class Distinct extends Sql {
  getText() {
    const value = this.formatTrueOrOtherExpression(this.value);

    return value ? `DISTINCT ${value}` : 'DISTINCT';
  }
}

module.exports = Distinct;
