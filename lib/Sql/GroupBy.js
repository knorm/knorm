const Sql = require('../Sql');

class GroupBy extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), {
      formatExpression: groupBy => {
        return this.formatExpression(groupBy, {
          formatPrimitive: value => {
            return this.formatIntegerOrFieldExpression(value);
          }
        });
      }
    });
  }

  formatText() {
    return `GROUP BY ${this.formatValue()}`;
  }
}

module.exports = GroupBy;
