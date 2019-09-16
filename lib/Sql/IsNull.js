const Sql = require('../Sql');

class IsNull extends Sql {
  getText() {
    const { field } = this.value;

    return `${this.formatColumnExpression(field)} IS NULL`;
  }
}

module.exports = IsNull;
