const Sql = require('../Sql');

class IsNotNull extends Sql {
  formatValue() {
    const { field } = this.getValue();

    const formattedField = this.formatFieldExpression(field);

    return `${formattedField} IS NOT NULL`;
  }
}

module.exports = IsNotNull;
