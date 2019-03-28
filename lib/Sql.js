const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';

class Sql {
  constructor(query) {
    this.query = query;
  }

  placeholder() {
    return '?';
  }

  quote(identifier) {
    return identifier;
  }

  distinct() {
    return this.query.options.distinct ? 'DISTINCT' : '';
  }

  columns() {
    const fields = this.query.options.fields;

    if (!fields) {
      return '';
    }

    const schema = this.query.model.schema;
    const table = this.quote(this.query.model.table);
    const prefix = schema ? `${this.quote(schema)}.${table}` : table;

    const columns = [];
    const aliases = [];

    fields.forEach(field => {
      if (isString(field)) {
        field = { [field]: field };
      }

      if (isObject(field)) {
        Object.entries(field).forEach(([alias, field]) => {
          // TODO: raw sql
          // TODO: strict mode: validate field-name
          const column = this.query.model.config.fieldsToColumns[field];
          columns.push(`${prefix}.${this.quote(column)}`);
          aliases.push(alias);
        });
      }
    });

    this.query.setOption('aliases', aliases);

    return columns.join(', ');
  }

  table() {
    const schema = this.query.model.schema;
    const table = this.quote(this.query.model.table);

    return schema ? `${this.quote(schema)}.${table}` : table;
  }

  from() {
    return this.table();
  }

  select() {
    return `SELECT ${this.distinct()} ${this.columns()} ${this.from()}`;
  }

  getSql() {
    if (this.query.options.select) {
      return this.select();
    }
  }
}

module.exports = Sql;
