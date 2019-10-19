const Sql = require('../Sql');

class Offset extends Sql {
  formatValue() {
    return this.formatIntegerExpression(this.getValue());
  }

  formatText() {
    return `OFFSET ${this.formatValue()}`;
  }
}

module.exports = Offset;
