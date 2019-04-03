class Sql {
  // TODO: pass a query instance or Model class?
  constructor(query) {
    this.query = query;
  }

  quote(identifier) {
    return identifier;
  }

  getTable() {
    const schema = this.query.getSchema();
    const table = this.quote(this.query.getTable());
    return schema ? `${this.quote(schema)}.${table}` : table;
  }

  getColumn(field) {
    if (field instanceof this.constructor.Raw) {
      return { column: field.sql, values: field.values };
    }

    const table = this.getTable();
    const column = this.quote(this.query.getColumn(field));

    return { column: `${table}.${column}`, values: [] };
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

    return { columns: columns.join(', '), aliases, values };
  }

  getFrom() {
    return `FROM ${this.getTable()}`;
  }

  getWhere() {
    const value = this.query.getOption('where');

    if (!value) {
      return { where: '', values: [] };
    }

    const grouping = new this.constructor.Grouping({ type: 'and', value });
    const where = grouping.getWhere(this);

    where.where = `WHERE ${where.where}`;

    return where;
  }

  getSelect() {
    const distinct = this.getDistinct();
    const columns = this.getColumns();
    const from = this.getFrom();
    const where = this.getWhere();

    let sql = 'SELECT';
    const parts = [distinct, columns.columns, from, where.where];

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
}

module.exports = Sql;

// TODO: Sql.updateRaw
Sql.Raw = require('./Sql/Raw');

// TODO: Sql.updateGrouping

Sql.Grouping = require('./Sql/Grouping');

// TODO: Sql.updateCondition
Sql.Condition = require('./Sql/Condition');
