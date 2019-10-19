const Sql = require('../Sql');

class Columns extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), {
      formatExpression: field => this.formatColumn(field)
    });
  }

  formatText() {
    return `(${this.formatValue()})`;
  }
}

module.exports = Columns;
