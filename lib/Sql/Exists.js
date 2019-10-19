const Sql = require('../Sql');

class Exists extends Sql {
  formatValue() {
    return this.formatExpression(this.getValue());
  }

  formatText() {
    return `EXISTS ${this.formatValue()}`;
  }
}

module.exports = Exists;
