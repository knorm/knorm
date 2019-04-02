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

    const type = this.type;
    let where;

    if (type === 'not') {
      where = `NOT ${placeholder}`;
    } else if (type === 'exists') {
      where = `EXISTS ${placeholder}`;
    } else if (type === 'any') {
      where = `ANY ${placeholder}`;
    } else if (type === 'all') {
      where = `ALL ${placeholder}`;
    } else if (type === 'isNull') {
      where = `${column} IS NULL`;
    } else if (type === 'isNotNull') {
      where = `${column} IS NOT NULL`;
    } else if (type === 'equalTo') {
      where = `${column} = ${placeholder}`;
    } else if (type === 'notEqualTo') {
      where = `${column} <> ${placeholder}`;
    } else if (type === 'greaterThan') {
      where = `${column} > ${placeholder}`;
    } else if (type === 'greaterThanOrEqualTo') {
      where = `${column} >= ${placeholder}`;
    } else if (type === 'lessThan') {
      where = `${column} < ${placeholder}`;
    } else if (type === 'lessThanOrEqualTo') {
      where = `${column} <= ${placeholder}`;
    } else if (type === 'like') {
      where = `${column} LIKE ${placeholder}`;
      // TODO: postgres only
      // } else if (type === 'ilike') {
      //   where = `${column} ILIKE ${placeholder}`;
    } else if (type === 'between') {
      where = `${column} BETWEEN ${placeholder}`;
    } else if (type === 'in') {
      where = `${column} IN ${placeholder}`;
    }

    return { where, values };
  }
}

module.exports = Condition;

const Sql = require('./Sql');
const Raw = require('./Raw');
const Query = require('./Query');
const Grouping = require('./Grouping');
