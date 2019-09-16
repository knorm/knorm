const Sql = require('../Sql');

class GreaterThanOrEqualTo extends Sql {
  getText() {
    let { field, value } = this.value;

    field = this.formatColumnExpression(field);
    value = this.formatExpression(value);

    return `${field} >= ${value}`;
  }
}

module.exports = GreaterThanOrEqualTo;
