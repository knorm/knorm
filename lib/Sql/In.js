const Sql = require('../Sql');

class In extends Sql {
  formatValue() {
    const { field, value } = this.getValue();

    // TODO: strict mode: warn when value is an empty array
    if (!value.length) {
      value.push(null);
    }

    const formattedField = this.formatFieldExpression(field);
    const formattedValue = this.formatExpressions(value);

    return `${formattedField} IN (${formattedValue})`;
  }
}

module.exports = In;
