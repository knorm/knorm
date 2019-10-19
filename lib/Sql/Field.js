const Sql = require('../Sql');

class Field extends Sql {
  formatValue() {
    return this.formatFieldExpression(this.getValue());
  }
}

module.exports = Field;
