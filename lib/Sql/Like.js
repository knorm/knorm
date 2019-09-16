const Sql = require('../Sql');

class Like extends Sql {
  getText() {
    let { field, value } = this.value;

    field = this.formatColumnExpression(field);
    value = this.formatExpression(value);

    return `${field} LIKE ${value}`;
  }
}

module.exports = Like;
