const Sql = require('../Sql');

class Between extends Sql {
  formatValue() {
    const { field, value1, value2 } = this.getValue();

    const formattedField = this.formatFieldExpression(field);
    const formattedValue1 = this.formatExpression(value1);
    const formattedValue2 = this.formatExpression(value2);

    return `${formattedField} BETWEEN ${formattedValue1} AND ${formattedValue2}`;
  }
}

module.exports = Between;
