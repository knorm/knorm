const Sql = require('../Sql');

class Expression extends Sql {
  constructor(Model, { type, field, value }) {
    super(Model);

    this.type = type;
    this.field = field;
    this.value = value;
  }

  formatArray(array, options) {
    return { sql: '?', values: [array] };
  }

  formatObject(object, options) {
    const { type } = this;

    if (type === 'and' || type === 'or') {
      const value = Object.entries(object).map(([field, value]) => {
        return new this.constructor(this.Model, {
          type: 'equalTo',
          field,
          value
        });
      });
      const expression = new this.constructor(this.Model, {
        type: 'and',
        value
      });

      return expression.formatExpression(options);
    }

    return { sql: '?', values: [object] };
  }

  formatPrimitive(value, options) {
    const formatted = { sql: '?' };

    if (value !== undefined) {
      formatted.values = [value];
    }

    return formatted;
  }

  formatValue(value, options) {
    if (value instanceof Query) {
      const formatted = value.formatQuery();
      formatted.sql = `(${formatted.sql})`;
      return formatted;
    }

    if (value instanceof Expression) {
      return value.formatExpression(options);
    }

    if (value instanceof Raw) {
      return value.formatRaw(options);
    }

    if (Array.isArray(value)) {
      return this.formatArray(value, options);
    }

    if (typeof value === 'object') {
      return this.formatObject(value, options);
    }

    return this.formatPrimitive(value, options);
  }

  formatValues(values, options) {
    const sqls = [];
    let sqlValues = [];

    values.forEach(value => {
      value = this.formatValue(value, options);

      sqls.push(value.sql);

      if (value.values) {
        sqlValues = sqlValues.concat(value.values);
      }
    });

    return { sqls, values: sqlValues };
  }

  // TODO: pass the value or use this.value directly?
  formatGrouping(value, options) {
    if (!Array.isArray(value)) {
      value = [value];
    }

    const { sqls, values } = this.formatValues(value, options);

    if (sqls.length === 1) {
      return { sql: sqls[0], values };
    }

    const { type } = this;
    const glue = type === 'and' ? ' AND ' : type === 'or' ? ' OR ' : '';
    const sql = `(${sqls.join(glue)})`;

    return { sql, values };
  }

  // TODO: strict mode: validate that value is an array of exactly 2
  // TODO: pass the value or use this.value directly?
  formatBetween(value, options) {
    const { sqls, values } = this.formatValues(value.slice(0, 2), options);
    const sql = sqls.join(' AND ');

    return { sql, values };
  }

  // TODO: strict mode: throw if array is empty
  // TODO: pass the value or use this.value directly?
  formatIn(value, options) {
    if (!value.length) {
      value = [null];
    }

    const { sqls, values } = this.formatValues(value, options);
    const sql = `(${sqls.join(', ')})`;

    return { sql, values };
  }

  formatExpression(options) {
    const { type } = this;

    if (type === 'and' || type === 'or') {
      return this.formatGrouping(this.value, options);
    }

    let column;
    let values = [];

    if (this.field) {
      const field = this.formatField(this.field, options);

      column = field.sql;

      if (field.values) {
        values = values.concat(field.values);
      }
    }

    let value;

    if (type === 'between') {
      value = this.formatBetween(this.value, options);
    } else if (type === 'in') {
      value = this.formatIn(this.value, options);
    } else {
      value = this.formatValue(this.value, options);
    }

    let placeholder;

    if (value) {
      placeholder = value.sql;

      if (value.values) {
        values = values.concat(value.values);
      }
    }

    let sql;

    if (type === 'not') {
      sql = `NOT ${placeholder}`;
    } else if (type === 'exists') {
      sql = `EXISTS ${placeholder}`;
    } else if (type === 'any') {
      sql = `ANY ${placeholder}`;
    } else if (type === 'some') {
      sql = `SOME ${placeholder}`;
    } else if (type === 'all') {
      sql = `ALL ${placeholder}`;
    } else if (type === 'not') {
      sql = `NOT ${placeholder}`;
    } else if (type === 'exists') {
      sql = `EXISTS ${placeholder}`;
    } else if (type === 'any') {
      sql = `ANY ${placeholder}`;
    } else if (type === 'some') {
      sql = `SOME ${placeholder}`;
    } else if (type === 'all') {
      sql = `ALL ${placeholder}`;
    } else if (type === 'isNull') {
      sql = `${column} IS NULL`;
    } else if (type === 'isNotNull') {
      sql = `${column} IS NOT NULL`;
    } else if (type === 'equalTo') {
      sql = `${column} = ${placeholder}`;
    } else if (type === 'notEqualTo') {
      sql = `${column} <> ${placeholder}`;
    } else if (type === 'greaterThan') {
      sql = `${column} > ${placeholder}`;
    } else if (type === 'greaterThanOrEqualTo') {
      sql = `${column} >= ${placeholder}`;
    } else if (type === 'lessThan') {
      sql = `${column} < ${placeholder}`;
    } else if (type === 'lessThanOrEqualTo') {
      sql = `${column} <= ${placeholder}`;
    } else if (type === 'like') {
      sql = `${column} LIKE ${placeholder}`;
    } else if (type === 'between') {
      sql = `${column} BETWEEN ${placeholder}`;
    } else if (type === 'in') {
      sql = `${column} IN ${placeholder}`;
    }

    return { sql, values };
  }
}

module.exports = Expression;

const Raw = require('./Raw');
const Query = require('../Query');
