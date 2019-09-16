const Sql = require('../Sql');

class All extends Sql {
  getText() {
    const value = this.formatTrueOrOtherExpression(this.value);

    return value ? `ALL ${value}` : 'ALL';
  }
}

module.exports = All;
