const Sql = require('../Sql');

class Where extends Sql {
  getText() {
    return `WHERE ${this.formatConditionExpression(this.value)}`;
  }
}

module.exports = Where;
