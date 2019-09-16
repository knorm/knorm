const Sql = require('../Sql');

class ForUpdate extends Sql {
  getText() {
    const value = this.formatTrueOrOtherExpression(this.value);

    return value ? `FOR UPDATE ${value}` : 'FOR UPDATE';
  }
}

module.exports = ForUpdate;
