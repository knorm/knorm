class Condition {
  constructor({ type, field, value }) {
    this.type = type;
    this.field = field;
    this.value = value;
  }

  getColumn(sql) {
    const field = this.field;

    // TODO: strict mode: throw if `field` is not set
    if (!field) {
      return;
    }

    return sql.getColumn(field);
  }

  getValue(sql) {
    const value = this.value;

    // TODO: strict mode: throw if `value` is not set
    if (!value) {
      return;
    }

    if (value instanceof Query) {
      const sql = new Sql(value).getSelect();
      return { placeholder: `(${sql.sql})`, values: sql.values };
    }

    if (value instanceof Raw) {
      return { placeholder: value.sql, values: value.values };
    }

    if (value instanceof Condition) {
      const where = value.getWhere(sql);
      return { placeholder: where.where, values: where.values };
    }

    if (this.type === 'between') {
      const placeholder = `${sql.getPlaceholder()} AND ${sql.getPlaceholder()}`;
      return { placeholder, values: value.slice(0, 2) };
    }

    if (this.type === 'in') {
      if (!value.length) {
        return { placeholder: sql.getPlaceholder(), values: [false] };
      }
      const placeholders = value.map(() => sql.getPlaceholder()).join(', ');
      return { placeholder: `(${placeholders})`, values: value };
    }

    return { placeholder: sql.getPlaceholder(), values: [value] };
  }

  getWhere(sql) {
    const type = this.type;
    const column = this.getColumn(sql);
    const { placeholder, values } = this.getValue(sql);

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
