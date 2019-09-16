const Sql = require('../Sql');

class Columns extends Sql {
  getText() {
    const expressions = [];

    for (const item of this.value) {
      expressions.push(
        this.formatExpression(item, {
          formatPrimitive: column => {
            return this.formatColumnExpression(column, { qualify: false });
          }
        })
      );
    }

    return `(${expressions.join(', ')})`;
  }
}

module.exports = Columns;
