const Sql = require('../Sql');

class Asc extends Sql {
  getText() {
    const value = this.formatTrueOrOtherExpression(this.value);

    return value ? `ASC ${value}` : 'ASC';
  }
}

module.exports = Asc;
