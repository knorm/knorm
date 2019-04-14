const Sql = require('../Sql');

class Insert extends Sql {
  formatInto(options) {
    const table = this.formatTable(options);
    const alias = this.formatAlias(options);
    const sql = alias ? `${table.sql} AS ${alias.sql}` : table.sql;

    return { sql: `INTO ${sql}` };
  }

  formatColumns(options = {}) {
    const data = options.data;

    if (!data) {
      return;
    }

    if (data instanceof this.Model.Query) {
      return;
    }

    if (data instanceof this.Model.Sql.Raw) {
      return;
    }

    const firstRow = data[0];
    const fields = Object.keys(firstRow);
    const columns = fields.map(field => {
      const { sql } = this.formatColumn(field, options);
      return sql;
    });

    return { sql: `(${columns.join(', ')})` };
  }

  formatValue(value, options) {
    if (value instanceof this.Model.Query) {
      const { sql, values } = value.formatSelect();
      return { sql: `(${sql})`, values };
    }

    if (value instanceof this.Model.Sql.Raw) {
      return value.formatRaw(options);
    }

    return { sql: '?', values: [value] };
  }

  formatRow(row, options) {
    if (row instanceof this.Model.Query) {
      const { sql, values } = row.formatSelect();
      return { sql: `(${sql})`, values };
    }

    if (row instanceof this.Model.Sql.Raw) {
      return row.formatRaw(options);
    }

    const sqls = [];
    let values = [];

    Object.values(row).forEach(value => {
      value = this.formatValue(value, options);

      sqls.push(value.sql);

      if (value.values) {
        values = values.concat(value.values);
      }
    });

    return { sql: `${sqls.join(', ')}`, values };
  }

  formatData(data, options) {
    if (data instanceof this.Model.Query) {
      const { sql, values } = data.formatSelect();
      return { sql: `(${sql})`, values };
    }

    if (data instanceof this.Model.Sql.Raw) {
      return data.formatRaw(options);
    }

    const sqls = [];
    let values = [];

    data.forEach(row => {
      row = this.formatRow(row, options);

      sqls.push(`(${row.sql})`);

      if (row.values) {
        values = values.concat(row.values);
      }
    });

    return { sql: `${sqls.join(', ')}`, values };
  }

  formatValues(options = {}) {
    const data = options.data;

    if (!data) {
      return;
    }

    const { sql, values } = this.formatData(data, options);

    return { sql: `VALUES ${sql}`, values };
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
