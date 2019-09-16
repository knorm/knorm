const Sql = require('../Sql');

class Desc extends Sql {
  getText() {
    const value = this.formatTrueOrOtherExpression(this.value);

    return value ? `DESC ${value}` : 'DESC';
  }
}

module.exports = Desc;
