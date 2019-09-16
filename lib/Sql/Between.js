const Sql = require('../Sql');

class Between extends Sql {
  getText() {
    let { field, value } = this.value;
    const expressions = [];

    for (const item of value) {
      expressions.push(this.formatExpression(item));
    }

    value = expressions.join(' AND ');
    field = this.formatColumnExpression(field);

    return `${field} BETWEEN ${value}`;
  }
}

module.exports = Between;
