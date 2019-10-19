const Sql = require('../Sql');

class IsNull extends Sql {
  formatValue() {
    const { field } = this.getValue();

    const formattedField = this.formatFieldExpression(field);

    return `${formattedField} IS NULL`;
  }
}

module.exports = IsNull;
