const Sql = require('../Sql');

class Like extends Sql {
  formatValue() {
    const { field, value } = this.getValue();

    const formattedField = this.formatFieldExpression(field);
    const formattedValue = this.formatExpression(value);

    return `${formattedField} LIKE ${formattedValue}`;
  }
}

module.exports = Like;
