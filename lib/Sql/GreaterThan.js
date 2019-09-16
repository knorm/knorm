const Sql = require('../Sql');

class GreaterThan extends Sql {
  getText() {
    let { field, value } = this.value;

    field = this.formatColumnExpression(field);
    value = this.formatExpression(value);

    return `${field} > ${value}`;
  }
}

module.exports = GreaterThan;
