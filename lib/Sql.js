class Sql {
  constructor(query) {
    this.query = query;
  }

  quote(identifier) {
    return identifier;
  }

  getColumn(field) {
    if (field instanceof Raw) {
      return { column: field.sql, values: field.values };
    }

    const schema = this.query.getSchema();
    const table = this.quote(this.query.getTable());
    const prefix = schema ? `${this.quote(schema)}.${table}` : table;
    const column = this.quote(this.query.getColumn(field));

    return { column: `${prefix}.${column}`, values: [] };
  }

  getDistinct() {
    return this.query.getOption('distinct') ? 'DISTINCT' : '';
  }

  getColumns() {
    const fields = this.query.getOption('fields');
    const columns = [];
    const aliases = [];
    let values = [];

    (fields || []).forEach(field => {
      if (typeof field === 'string') {
        field = { [field]: field };
      }

      Object.entries(field).forEach(([alias, field]) => {
        const column = this.getColumn(field);

        aliases.push(alias);
        columns.push(column.column);
        values = values.concat(column.values);
      });
    });

    return { columns, aliases, values };
  }

  getTable() {
    const schema = this.query.model.schema;
    const table = this.quote(this.query.model.table);

    return schema ? `${this.quote(schema)}.${table}` : table;
  }

  getFrom() {
    return `FROM ${this.getTable()}`;
  }

  getWhere() {
    const value = this.query.getOption('where');

    if (!value) {
      return { where: '', values: [] };
    }

    const where = new Grouping({ type: 'and', value }).getWhere(this);
    where.where = `WHERE ${where.where}`;

    return where;
  }

  getSelect() {
    const distinct = this.getDistinct();
    const columns = this.getColumns();
    const from = this.getFrom();
    const where = this.getWhere();

    let sql = 'SELECT';
    const parts = [distinct, columns.columns.join(', '), from, where.where];

    for (const part of parts) {
      if (part) {
        sql += ` ${part}`;
      }
    }

    return {
      sql,
      aliases: columns.aliases,
      values: columns.values.concat(where.values)
    };
  }

  getSql() {
    if (this.query.getOption('select')) {
      return this.getSelect();
    }
  }
}

module.exports = Sql;

const Raw = require('./Raw');
const Grouping = require('./Grouping');
