const Sql = require('../Sql');

class Or extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), { glue: ' OR ' });
  }

  getText() {
    return `(${this.formatValue()})`;
  }
}

module.exports = Or;
