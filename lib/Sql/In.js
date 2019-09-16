const Sql = require('../Sql');

class In extends Sql {
  getText() {
    let { field, value } = this.value;

    // TODO: strict mode: warn when value is an empty array
    if (!value.length) {
      value = [null];
    }

    const expressions = [];

    for (const item of value) {
      expressions.push(this.formatExpression(item));
    }

    value = expressions.join(', ');
    field = this.formatColumnExpression(field);

    return `${field} IN (${value})`;
  }
}

module.exports = In;
