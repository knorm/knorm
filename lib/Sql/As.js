const Sql = require('../Sql');

class As extends Sql {
  getText() {
    let { value, alias } = this.value;
    const { columns } = this.value;

    value = this.formatExpression(value, {
      formatPrimitive: value => this.formatIdentifier(value)
    });
    alias = this.formatIdentifier(alias);

    let text = `${value} AS ${alias}`;

    if (columns) {
      const expressions = [];

      for (const item of columns) {
        expressions.push(this.formatIdentifier(item));
      }

      text += ` (${expressions.join(', ')})`;
    }

    return text;
  }
}

module.exports = As;
