const Sql = require('../Sql');

class As extends Sql {
  formatValue() {
    const { value, alias, columns } = this.getValue();

    const formattedValue = this.formatExpression(value, {
      formatPrimitive: value => this.formatIdentifier(value)
    });
    const formattedAlias = this.formatIdentifier(alias);

    let text = this.formatAlias(formattedValue, formattedAlias);

    if (columns) {
      const identifiers = this.formatExpressions(columns, {
        formatExpression: column => this.formatIdentifier(column)
      });

      text += ` (${identifiers})`;
    }

    return text;
  }
}

module.exports = As;
