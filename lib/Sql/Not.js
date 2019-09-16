const Sql = require('../Sql');

class Not extends Sql {
  getText() {
    return `NOT ${this.formatExpression(this.value)}`;
  }
}

module.exports = Not;
