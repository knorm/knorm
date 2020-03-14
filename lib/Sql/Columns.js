const Sql = require('../Sql');

class Columns extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), {
      formatExpression: field => this.formatField(field)
    });
  }

  getText() {
    return `(${this.formatValue()})`;
  }
}

module.exports = Columns;
