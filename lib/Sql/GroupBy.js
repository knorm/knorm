const Sql = require('../Sql');

class GroupBy extends Sql {
  getText() {
    const expressions = [];

    for (const item of this.value) {
      expressions.push(
        this.formatExpression(item, {
          formatPrimitive: value => {
            return this.formatIntegerOrColumnExpression(value);
          }
        })
      );
    }

    return `GROUP BY ${expressions.join(', ')}`;
  }
}

module.exports = GroupBy;
