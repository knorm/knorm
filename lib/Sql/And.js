const Sql = require('../Sql');

class And extends Sql {
  getText() {
    const expressions = [];

    for (const item of this.value) {
      expressions.push(this.formatExpression(item));
    }

    return expressions.join(' AND ');
  }
}

module.exports = And;
