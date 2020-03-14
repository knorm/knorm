const Sql = require('../Sql');

class OrderBy extends Sql {
  formatOrderByObject(object) {
    return this.formatExpressions(Object.entries(object), {
      formatExpression: ([field, direction]) => {
        field = this.formatFieldExpression(field);
        direction = this.formatExpression(direction, {
          formatPrimitive: direction => {
            const lower =
              typeof direction === 'string' && direction.toLowerCase();

            if (direction === 1 || lower === 'asc') {
              return this.formatSql(this.asc());
            }

            if (direction === -1 || lower === 'desc') {
              return this.formatSql(this.desc());
            }
          }
        });

        return `${field} ${direction}`;
      }
    });
  }

  formatValue() {
    return this.formatExpressions(this.getValue(), {
      formatExpression: field => {
        return this.formatExpression(field, {
          formatObject: object => {
            return this.formatOrderByObject(object);
          },
          formatPrimitive: value => {
            return this.formatIntegerOrFieldExpression(value);
          }
        });
      }
    });
  }

  getText() {
    return `ORDER BY ${this.formatValue()}`;
  }
}

module.exports = OrderBy;
