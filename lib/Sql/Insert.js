const Sql = require('../Sql');

class Insert extends Sql {
  formatColumns(options = {}) {
    const data = options.data;

    if (!data) {
      return;
    }

    if (data instanceof Raw) {
      return;
    }

    if (data instanceof Query) {
      return;
    }

    // NOTE: does not support Raw in the columns
    // NOTE: does not support values

    const firstRow = data[0];
    const fields = Object.keys(firstRow);
    const columns = fields.map(field => {
      const { sql } = this.formatColumn(field, options);
      return sql;
    });

    return { sql: `(${columns.join(',')})` };
  }

  formatValue(value, options) {
    if (value instanceof Query) {
      return value.formatQuery();
    }

    if (value instanceof Raw) {
      return value.formatRaw(options);
    }

    return { sql: '?', values: [value] };
  }

  formatValues(options = {}) {
    const data = options.data;

    if (!data) {
      return;
    }

    if (data instanceof Raw) {
      return data.formatRaw(this);
    }

    if (data instanceof Query) {
      return data.formatQuery();
    }

    const sqls = [];
    let values = [];

    data.forEach(row => {
      const placeholders = [];

      Object.values(row).forEach(value => {
        value = this.formatValue(value);

        placeholders.push(value.sql);

        if (value.values) {
          values = values.concat(value.values);
        }
      });

      sqls.push(`(${placeholders.join(', ')})`);
    });

    const sql = `VALUES ${sqls.join(', ')}`;

    return { sql, values };
  }

  formatInsert(options) {
    const into = this.formatInto(options);
    const columns = this.formatColumns(options);
    const values = this.formatValues(options);
    const returning = this.formatReturning(options);
    const insert = this.formatParts(
      [into, columns, values, returning],
      options
    );

    if (insert) {
      insert.sql = `INSERT ${insert.sql}`;
    }

    return insert;
  }
}

module.exports = Insert;

const Raw = require('./Raw');
const Query = require('../Query');
