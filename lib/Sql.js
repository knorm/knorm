/**
 * @typedef {object} FormattedSql
 * @property {string} sql The formatted SQL string, containing question marks
 * (?) as placeholders for vlues.
 * @property {array} [values] The values to be bound to the SQL string i.e.
 * to be used to as replacements for the question marks in the SQL string.
 */

/**
 *
 */
class Sql {
  constructor(Model) {
    // TODO: refactor `Model.config.fieldsToColumns` to `Model.config.columns`
    const { table, schema, config } = Model;

    this.schema = schema;
    this.table = table;
    this.columns = config.fieldsToColumns;
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

  some(value) {
    return new this.constructor.Condition({ type: 'some', value });
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

  quoteIdentifier(identifier) {
    return identifier;
  }

  /**
   *
   * @param {object} [options]
   */
  formatSchema() {
    if (!this.schema) {
      return;
    }

    return { sql: this.quoteIdentifier(this.schema) };
  }

  /**
   *
   * @param {object} [options]
   */
  formatTable(options) {
    // TODO: throw if `this.table` is not set
    const schema = this.formatSchema(options);
    const table = this.quoteIdentifier(this.table);
    const sql = schema ? `${schema.sql}.${table}` : table;

    return { sql };
  }

  formatAlias(options = {}) {
    if (!options.alias) {
      return;
    }

    return { sql: this.quoteIdentifier(options.alias) };
  }

  formatField(field, options) {
    if (field instanceof this.constructor.Raw) {
      return field.formatRaw(this);
    }

    const alias = this.formatAlias(options);
    const table = alias || this.formatTable(options);

    // TODO: throw if column is not found

    const column = this.quoteIdentifier(this.columns[field]);
    const sql = `${table.sql}.${column}`;

    return { sql };
  }

  formatFields(options = {}) {
    if (!options.fields) {
      return;
    }

    const sqls = [];
    const aliases = [];
    let values = [];

    options.fields.forEach(field => {
      if (typeof field === 'string') {
        field = { [field]: field };
      }

      Object.entries(field).forEach(([alias, field]) => {
        const column = this.formatField(field, options);

        aliases.push(alias);
        sqls.push(column.sql);

        if (column.values) {
          values = values.concat(column.values);
        }
      });
    });

    const formatted = { sql: sqls.join(', '), aliases };

    if (values.length) {
      formatted.values = values;
    }

    return formatted;
  }

  formatDistinct(options = {}) {
    if (!options.distinct) {
      return;
    }

    return { sql: 'DISTINCT' };
  }

  formatFrom(options) {
    const table = this.formatTable(options);
    const alias = this.formatAlias(options);
    const from = alias ? `${table.sql} AS ${alias.sql}` : table.sql;

    // TODO: support custom and multiple FROM clauses

    return { sql: `FROM ${from}` };
  }

  formatWhere(options = {}) {
    if (!options.where) {
      return;
    }

    const grouping = new this.constructor.Grouping({
      type: 'and',
      value: options.where
    });
    const where = grouping.formatGrouping(this);

    where.sql = `WHERE ${where.sql}`;

    return where;
  }

  formatSelect(options) {
    const distinct = this.formatDistinct(options);
    const fields = this.formatFields(options);
    const from = this.formatFrom(options);
    const where = this.formatWhere(options);

    let sql = 'SELECT';
    let values = [];
    const parts = [distinct, fields, from, where];

    for (const part of parts) {
      if (part) {
        sql += ` ${part.sql}`;

        if (part.values) {
          values = values.concat(part.values);
        }
      }
    }

    const formatted = { sql };

    if (fields) {
      formatted.aliases = fields.aliases;
    }

    if (values.length) {
      formatted.values = values;
    }

    return formatted;
  }

  /**
   * Updates the {@link Raw} class used by {@link Sql}.
   *
   * @param {Raw} Raw The new class, which should extend the current
   * {@link Sql.Raw} class.
   *
   * @returns {Sql} The {@link Sql} class, to allow chaining.
   */
  static updateRaw(Raw) {
    // TODO: validate that Raw is a child of this.Raw

    /**
     * The {@link Raw} class used by {@link Sql} to create new instances.
     */
    this.Raw = Raw;

    return this;
  }

  /**
   * Updates the {@link Grouping} class used by {@link Sql}.
   *
   * @param {Grouping} Grouping The new class, which should extend the current
   * {@link Sql.Grouping} class.
   *
   * @returns {Sql} The {@link Sql} class, to allow chaining.
   */
  static updateGrouping(Grouping) {
    // TODO: validate that Grouping is a child of this.Grouping

    /**
     * The {@link Grouping} class used by {@link Sql} to create new instances.
     */
    this.Grouping = Grouping;

    return this;
  }

  /**
   * Updates the {@link Condition} class used by {@link Sql}.
   *
   * @param {Condition} Condition The new class, which should extend the current
   * {@link Sql.Condition} class.
   *
   * @returns {Sql} The {@link Sql} class, to allow chaining.
   */
  static updateCondition(Condition) {
    // TODO: validate that Condition is a child of this.Condition

    /**
     * The {@link Condition} class used by {@link Sql} to create new instances.
     */
    this.Condition = Condition;

    return this;
  }
}

module.exports = Sql;

// TODO: test Sql.updateRaw
Sql.updateRaw(require('./Sql/Raw'));
// TODO: test Sql.updateGrouping
Sql.updateGrouping(require('./Sql/Grouping'));
// TODO: test Sql.updateCondition
Sql.updateCondition(require('./Sql/Condition'));
