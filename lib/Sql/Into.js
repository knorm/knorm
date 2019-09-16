const Sql = require('../Sql');

class Into extends Sql {
  getText() {
    return `INTO ${this.formatExpression(this.value)}`;
  }
}

module.exports = Into;
