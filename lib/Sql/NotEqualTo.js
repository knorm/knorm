const Sql = require('../Sql');

class NotEqualTo extends Sql {
  getText() {
    let { field, value } = this.value;

    field = this.formatColumnExpression(field);
    value = this.formatExpression(value);

    return `${field} <> ${value}`;
  }
}

module.exports = NotEqualTo;
