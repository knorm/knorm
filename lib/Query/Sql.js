class Sql {
  constructor(Model) {
    this.Model = Model;
  }

  raw(sql) {
    return new this.constructor.Raw(sql);
  }

  and(value) {
    return new this.constructor.Grouping({ type: 'and', value });
  }

  or(value) {
    return new this.constructor.Grouping({ type: 'or', value });
  }

  not(value) {
    return new this.constructor.Condition({ type: 'not', value });
  }

  any(value) {
    return new this.constructor.Condition({ type: 'any', value });
  }

  all(value) {
    return new this.constructor.Condition({ type: 'all', value });
  }

  exists(value) {
    return new this.constructor.Condition({ type: 'exists', value });
  }

  isNull(field) {
    return new this.constructor.Condition({ type: 'isNull', field });
  }

  isNotNull(field) {
    return new this.constructor.Condition({ type: 'isNotNull', field });
  }

  equalTo(field, value) {
    return new this.constructor.Condition({ type: 'equalTo', field, value });
  }

  notEqualTo(field, value) {
    return new this.constructor.Condition({ type: 'notEqualTo', field, value });
  }

  greaterThan(field, value) {
    return new this.constructor.Condition({
      type: 'greaterThan',
      field,
      value
    });
  }

  greaterThanOrEqualTo(field, value) {
    return new this.constructor.Condition({
      type: 'greaterThanOrEqualTo',
      field,
      value
    });
  }

  lessThan(field, value) {
    return new this.constructor.Condition({ type: 'lessThan', field, value });
  }

  lessThanOrEqualTo(field, value) {
    return new this.constructor.Condition({
      type: 'lessThanOrEqualTo',
      field,
      value
    });
  }

  like(field, value) {
    return new this.constructor.Condition({ type: 'like', field, value });
  }

  // TODO: postgres only
  // ilike(field, value) {
  //   return new this.constructor.Condition({ type: 'ilike', field, value });
  // }

  between(field, value) {
    return new this.constructor.Condition({ type: 'between', field, value });
  }

  in(field, value) {
    return new this.constructor.Condition({ type: 'in', field, value });
  }

  quote(identifier) {
    return identifier;
  }

  formatSchema() {
    return this.Model.schema && this.quote(this.Model.schema);
  }

  formatTable() {
    // TODO: throw if `Model.table` is not set
    const schema = this.formatSchema();
    const table = this.quote(this.Model.table);
    return schema ? `${schema}.${table}` : table;
  }

  formatColumn(field) {
    if (field instanceof this.constructor.Raw) {
      return { column: field.sql, values: field.values };
    }

    const table = this.formatTable();

    // TODO: throw if column is not found
    // TODO: refactor `fieldsToColumns` to `columns`

    const column = this.quote(this.Model.config.fieldsToColumns[field]);

    return { column: `${table}.${column}`, values: [] };
  }

  formatColumns(options = {}) {
    const fields = options.fields;
    const columns = [];
    const aliases = [];
    let values = [];

    (fields || []).forEach(field => {
      if (typeof field === 'string') {
        field = { [field]: field };
      }

      Object.entries(field).forEach(([alias, field]) => {
        const column = this.formatColumn(field);
        aliases.push(alias);
        columns.push(column.column);
        values = values.concat(column.values);
      });
    });

    return { columns: columns.join(', '), aliases, values };
  }

  formatDistinct(options = {}) {
    return options.distinct ? 'DISTINCT' : '';
  }

  formatFrom() {
    return `FROM ${this.formatTable()}`;
  }

  formatWhere(options = {}) {
    if (!options.where) {
      return { where: '', values: [] };
    }

    const grouping = new this.constructor.Grouping({
      type: 'and',
      value: options.where
    });

    const where = grouping.formatWhere(this);
    where.where = `WHERE ${where.where}`;

    return where;
  }

  formatSelect(options) {
    const distinct = this.formatDistinct(options);
    const columns = this.formatColumns(options);
    const from = this.formatFrom();
    const where = this.formatWhere(options);

    let sql = 'SELECT';
    const parts = [distinct, columns.columns, from, where.where];

    for (const part of parts) {
      if (part) {
        sql += ` ${part}`;
      }
    }

    const values = columns.values.concat(where.values);

    return { sql, values, aliases: columns.aliases };
  }
}

module.exports = Sql;

// TODO: Sql.updateRaw
Sql.Raw = require('./Sql/Raw');

// TODO: Sql.updateGrouping

Sql.Grouping = require('./Sql/Grouping');

// TODO: Sql.updateCondition
Sql.Condition = require('./Sql/Condition');
