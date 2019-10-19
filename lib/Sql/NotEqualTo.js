const Sql = require('../Sql');

class NotEqualTo extends Sql {
  formatValue() {
    const { field, value } = this.getValue();

    const formattedField = this.formatFieldExpression(field);
    const formattedValue = this.formatExpression(value);

    return `${formattedField} <> ${formattedValue}`;
  }
}

module.exports = NotEqualTo;
