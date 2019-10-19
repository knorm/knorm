const Sql = require('../Sql');

class And extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), { glue: ' AND ' });
  }
}

module.exports = And;
