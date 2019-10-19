const Sql = require('../Sql');

class LessThan extends Sql {
  formatValue() {
    const { field, value } = this.getValue();

    const formattedField = this.formatFieldExpression(field);
    const formattedValue = this.formatExpression(value);

    return `${formattedField} < ${formattedValue}`;
  }
}

module.exports = LessThan;
