const Sql = require('../Sql');

class LessThan extends Sql {
  getText() {
    let { field, value } = this.value;

    field = this.formatColumnExpression(field);
    value = this.formatExpression(value);

    return `${field} < ${value}`;
  }
}

module.exports = LessThan;
