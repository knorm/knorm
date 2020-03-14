const Sql = require('../Sql');

class From extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue());
  }

  getText() {
    return `FROM ${this.formatValue()}`;
  }
}

module.exports = From;
