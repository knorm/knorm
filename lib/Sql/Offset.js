const Sql = require('../Sql');

class Offset extends Sql {
  getText() {
    return `OFFSET ${this.formatIntegerExpression(this.value)}`;
  }
}

module.exports = Offset;
