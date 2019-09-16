const Sql = require('../Sql');

class IsNotNull extends Sql {
  getText() {
    const { field } = this.value;

    return `${this.formatColumnExpression(field)} IS NOT NULL`;
  }
}

module.exports = IsNotNull;
