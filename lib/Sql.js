class Sql {
  constructor(query) {
    this.query = query;
  }

  getPlaceholder() {
    return '?';
  }

  quote(identifier) {
    return identifier;
  }

  getColumn(field) {
    const schema = this.query.getSchema();
    const table = this.quote(this.query.getTable());
    // TODO: support raw sql
    const column = this.quote(this.query.getColumn(field));
    const prefix = schema ? `${this.quote(schema)}.${table}` : table;

    return `${prefix}.${column}`;
  }

  getDistinct() {
    return this.query.getOption('distinct') ? 'DISTINCT' : '';
  }

  getColumns() {
    const fields = this.query.getOption('fields');
    const columns = [];
    const aliases = [];

    (fields || []).forEach(field => {
      if (typeof field === 'string') {
        field = { [field]: field };
      }

      Object.entries(field).forEach(([alias, field]) => {
        columns.push(this.getColumn(field));
        aliases.push(alias);
      });
    });

    return { columns: columns.join(', '), fields: aliases };
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
    let sql = 'SELECT';

    const { columns, fields } = this.getColumns();
    const { where, values } = this.getWhere();
    const parts = [this.getDistinct(), columns, this.getFrom(), where];

    for (const part of parts) {
      if (part) {
        sql += ` ${part}`;
      }
    }

    return { sql, fields, values };
  }

  getSql() {
    if (this.query.getOption('select')) {
      return this.getSelect();
    }
  }
}

module.exports = Sql;

const Grouping = require('./Grouping');
