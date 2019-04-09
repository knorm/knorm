class Condition {
  constructor({ type, field, value }) {
    this.type = type;
    this.field = field;
    this.value = value;
  }

  formatValue(sql) {
    let value = this.value;

    if (value instanceof Query) {
      const { sql, values } = value.formatQuery();
      return { sql: `(${sql})`, values };
    }

    if (value instanceof Grouping) {
      return value.formatGrouping(sql);
    }

    if (value instanceof Condition) {
      return value.formatCondition(sql);
    }

    if (value instanceof Raw) {
      return value.formatRaw(sql);
    }

    if (this.type === 'between') {
      return { sql: `? AND ?`, values: value.slice(0, 2) };
    }

    if (this.type === 'in') {
      if (!value.length) {
        value = [null];
      }

      const placeholders = value.map(() => '?').join(', ');

      return { sql: `(${placeholders})`, values: value };
    }

    return { sql: '?', values: [value] };
  }

  // TODO: _formatCondition?
  // TODO: formatType(sql, { left, right })?
  formatType(sql, { column, placeholder }) {
    const type = this.type;

    if (type === 'not') {
      return { sql: `NOT ${placeholder}` };
    }

    if (type === 'exists') {
      return { sql: `EXISTS ${placeholder}` };
    }

    if (type === 'any') {
      return { sql: `ANY ${placeholder}` };
    }

    if (type === 'some') {
      return { sql: `SOME ${placeholder}` };
    }

    if (type === 'all') {
      return { sql: `ALL ${placeholder}` };
    }

    if (type === 'isNull') {
      return { sql: `${column} IS NULL` };
    }

    if (type === 'isNotNull') {
      return { sql: `${column} IS NOT NULL` };
    }

    if (type === 'equalTo') {
      return { sql: `${column} = ${placeholder}` };
    }

    if (type === 'notEqualTo') {
      return { sql: `${column} <> ${placeholder}` };
    }

    if (type === 'greaterThan') {
      return { sql: `${column} > ${placeholder}` };
    }

    if (type === 'greaterThanOrEqualTo') {
      return { sql: `${column} >= ${placeholder}` };
    }

    if (type === 'lessThan') {
      return { sql: `${column} < ${placeholder}` };
    }

    if (type === 'lessThanOrEqualTo') {
      return { sql: `${column} <= ${placeholder}` };
    }

    if (type === 'like') {
      return { sql: `${column} LIKE ${placeholder}` };
    }

    // TODO: postgres only
    // if (type === 'ilike') {
    //   return { sql: `${column} ILIKE ${placeholder}`};
    // }

    if (type === 'between') {
      return { sql: `${column} BETWEEN ${placeholder}` };
    }

    if (type === 'in') {
      return { sql: `${column} IN ${placeholder}` };
    }
  }

  formatCondition(sql) {
    let column;
    let values = [];

    if (this.field) {
      const formattedField = sql.formatField(this.field);

      column = formattedField.sql;

      if (formattedField.values) {
        values = formattedField.values;
      }
    }

    let placeholder = '';

    if (this.value) {
      const formattedValue = this.formatValue(sql);

      placeholder = formattedValue.sql;

      if (formattedValue.values) {
        values = values.concat(formattedValue.values);
      }
    }

    const formatted = this.formatType(sql, { column, placeholder });

    if (values.length) {
      formatted.values = values;
    }

    return formatted;
  }
}

module.exports = Condition;

const Raw = require('./Raw');
const Query = require('../Query');
const Grouping = require('./Grouping');
