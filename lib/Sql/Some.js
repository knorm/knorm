const Sql = require('../Sql');

class Some extends Sql {
  getText() {
    return `SOME ${this.formatExpression(this.value)}`;
  }
}

module.exports = Some;
