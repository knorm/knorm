class Condition {
  constructor({ type, field, value }) {
    this.type = type;
    this.field = field;
    this.value = value;
  }

  getColumn(sql) {
    const field = this.field;
    return sql.getColumn(field);
  }

  getPlaceholder(sql) {
    const value = this.value;

    if (value instanceof Query) {
      const select = new Sql(value).getSelect();
      return { placeholder: `(${select.sql})`, values: select.values };
    }

    if (value instanceof Raw) {
      return { placeholder: value.sql, values: value.values };
    }

    if (value instanceof Condition || value instanceof Grouping) {
      const where = value.getWhere(sql);
      return { placeholder: where.where, values: where.values };
    }

    if (this.type === 'between') {
      return { placeholder: `? AND ?`, values: value.slice(0, 2) };
    }

    if (this.type === 'in') {
      if (!value.length) {
        return { placeholder: '?', values: [false] };
      }

      const placeholders = value.map(() => '?').join(', ');
      return { placeholder: `(${placeholders})`, values: value };
    }

    return { placeholder: '?', values: [value] };
  }

  // TODO: can this resemble Grouping.prototype._getWhere?
  _getWhere({ column, placeholder }) {
    const type = this.type;

    if (type === 'not') {
      return `NOT ${placeholder}`;
    }

    if (type === 'exists') {
      return `EXISTS ${placeholder}`;
    }

    if (type === 'any') {
      return `ANY ${placeholder}`;
    }

    if (type === 'all') {
      return `ALL ${placeholder}`;
    }

    if (type === 'isNull') {
      return `${column} IS NULL`;
    }

    if (type === 'isNotNull') {
      return `${column} IS NOT NULL`;
    }

    if (type === 'equalTo') {
      return `${column} = ${placeholder}`;
    }

    if (type === 'notEqualTo') {
      return `${column} <> ${placeholder}`;
    }

    if (type === 'greaterThan') {
      return `${column} > ${placeholder}`;
    }

    if (type === 'greaterThanOrEqualTo') {
      return `${column} >= ${placeholder}`;
    }

    if (type === 'lessThan') {
      return `${column} < ${placeholder}`;
    }

    if (type === 'lessThanOrEqualTo') {
      return `${column} <= ${placeholder}`;
    }

    if (type === 'like') {
      return `${column} LIKE ${placeholder}`;
    }

    // TODO: postgres only
    // if (type === 'ilike') {
    //   return `${column} ILIKE ${placeholder}`;
    // }

    if (type === 'between') {
      return `${column} BETWEEN ${placeholder}`;
    }

    if (type === 'in') {
      return `${column} IN ${placeholder}`;
    }
  }

  getWhere(sql) {
    let column;
    let values = [];
    let placeholder = '';

    if (this.field) {
      const _column = this.getColumn(sql);
      column = _column.column;
      values = values.concat(_column.values);
    }

    if (this.value) {
      const _placeholder = this.getPlaceholder(sql);
      placeholder = _placeholder.placeholder;
      values = values.concat(_placeholder.values);
    }

    const where = this._getWhere({ column, placeholder });

    return { where, values };
  }
}

module.exports = Condition;

const Sql = require('../Sql');
const Raw = require('./Raw');
const Query = require('../../Query');
const Grouping = require('./Grouping');
