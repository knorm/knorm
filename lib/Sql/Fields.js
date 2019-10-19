const Sql = require('../Sql');

class Fields extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), {
      formatExpression: field => {
        return this.formatExpression(field, {
          formatObject: fields => {
            return this.formatExpressions(Object.values(fields), {
              formatExpression: field => this.formatFieldExpression(field)
            });
          },
          formatPrimitive: fieldName => {
            return this.formatField(fieldName);
          }
        });
      }
    });
  }
}

module.exports = Fields;
