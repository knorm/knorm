const Sql = require('../Sql');

class Limit extends Sql {
  getText() {
    return `LIMIT ${this.formatIntegerExpression(this.value)}`;
  }
}

module.exports = Limit;
