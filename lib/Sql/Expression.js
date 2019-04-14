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
        return new this.Model.Sql.Expression(this.Model, {
          type: 'equalTo',
          field,
          value
        });
      });
      const expression = new this.Model.Sql.Expression(this.Model, {
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
    if (value instanceof this.Model.Query) {
      const formatted = value.formatSelect();
      formatted.sql = `(${formatted.sql})`;
      return formatted;
    }

    if (value instanceof this.Model.Sql.Expression) {
      return value.formatExpression(options);
    }

    if (value instanceof this.Model.Sql.Raw) {
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
    const { type } = this;

    if (type === 'between') {
      value = this.formatBetween(this.value, options);
    } else if (type === 'in') {
      value = this.formatIn(this.value, options);
    } else if (type === 'and' || type === 'or') {
      value = this.formatGrouping(this.value, options);
    } else {
      value = this.formatValue(this.value, options);
    }

    if (value.values) {
      values = values.concat(value.values);
    }

    let sql = value.sql;

    if (type === 'not') {
      sql = `NOT ${sql}`;
    } else if (type === 'exists') {
      sql = `EXISTS ${sql}`;
    } else if (type === 'any') {
      sql = `ANY ${sql}`;
    } else if (type === 'some') {
      sql = `SOME ${sql}`;
    } else if (type === 'all') {
      sql = `ALL ${sql}`;
    } else if (type === 'not') {
      sql = `NOT ${sql}`;
    } else if (type === 'exists') {
      sql = `EXISTS ${sql}`;
    } else if (type === 'any') {
      sql = `ANY ${sql}`;
    } else if (type === 'some') {
      sql = `SOME ${sql}`;
    } else if (type === 'all') {
      sql = `ALL ${sql}`;
    } else if (type === 'distinct') {
      sql = `DISTINCT ${sql}`;
    } else if (type === 'isNull') {
      sql = `${column} IS NULL`;
    } else if (type === 'isNotNull') {
      sql = `${column} IS NOT NULL`;
    } else if (type === 'equalTo') {
      sql = `${column} = ${sql}`;
    } else if (type === 'notEqualTo') {
      sql = `${column} <> ${sql}`;
    } else if (type === 'greaterThan') {
      sql = `${column} > ${sql}`;
    } else if (type === 'greaterThanOrEqualTo') {
      sql = `${column} >= ${sql}`;
    } else if (type === 'lessThan') {
      sql = `${column} < ${sql}`;
    } else if (type === 'lessThanOrEqualTo') {
      sql = `${column} <= ${sql}`;
    } else if (type === 'like') {
      sql = `${column} LIKE ${sql}`;
    } else if (type === 'between') {
      sql = `${column} BETWEEN ${sql}`;
    } else if (type === 'in') {
      sql = `${column} IN ${sql}`;
    }

    return { sql, values };
  }
}

module.exports = Expression;
