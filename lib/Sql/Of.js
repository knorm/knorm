const Sql = require('../Sql');

class Of extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), {
      formatExpression: field => this.formatFieldExpression(field)
    });
  }

  formatText() {
    return `OF ${this.formatValue()}`;
  }
}

module.exports = Of;
