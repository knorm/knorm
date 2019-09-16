const Sql = require('../Sql');

class OrderBy extends Sql {
  formatOrderByObject(object) {
    return Object.entries(object)
      .map(([field, direction]) => {
        field = this.formatColumnExpression(field);
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
      })
      .join(', ');
  }

  getText() {
    const orderBy = this.value
      .map(field => {
        return this.formatExpression(field, {
          formatObject: object => {
            return this.formatOrderByObject(object);
          },
          formatPrimitive: value => {
            return this.formatIntegerOrColumnExpression(value);
          }
        });
      })
      .join(', ');

    return `ORDER BY ${orderBy}`;
  }
}

module.exports = OrderBy;
