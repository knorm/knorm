/**
 * @typedef {object} FormattedSql
 * @property {string} sql The formatted SQL string, containing question marks
 * (?) as placeholders for values.
 * @property {array} [values] The values to be bound to the SQL string i.e.
 * to be used to as replacements for the question marks in the SQL string.
 * @property {array} [aliases] The list of return fields for the SQL, once it's
 * run. This is only returned if the {@link Options#fields} option was set.
 */

/**
 * Generates SQL.
 */
class Sql {
  /**
   * Creates a new {@link Sql} instance.
   *
   * @param {Model} Model The model class to bind the new instance to.
   */
  constructor(Model) {
    this.Model = Model;
  }

  /**
   * Creates a new {@link Raw} instance.
   *
   * @param {string|object} raw The raw SQL. See {@link Raw} for more info.
   *
   * @returns {Raw}
   */
  raw(raw) {
    return new this.Model.Sql.Raw(this.Model, raw);
  }

  and(value) {
    return new this.Model.Sql.Expression(this.Model, { type: 'and', value });
  }

  or(value) {
    return new this.Model.Sql.Expression(this.Model, { type: 'or', value });
  }

  not(value) {
    return new this.Model.Sql.Expression(this.Model, { type: 'not', value });
  }

  any(value) {
    return new this.Model.Sql.Expression(this.Model, { type: 'any', value });
  }

  some(value) {
    return new this.Model.Sql.Expression(this.Model, { type: 'some', value });
  }

  all(value) {
    return new this.Model.Sql.Expression(this.Model, { type: 'all', value });
  }

  distinct(value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'distinct',
      value
    });
  }

  exists(value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'exists',
      value
    });
  }

  isNull(field) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'isNull',
      field
    });
  }

  isNotNull(field) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'isNotNull',
      field
    });
  }

  equalTo(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'equalTo',
      field,
      value
    });
  }

  notEqualTo(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'notEqualTo',
      field,
      value
    });
  }

  greaterThan(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'greaterThan',
      field,
      value
    });
  }

  greaterThanOrEqualTo(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'greaterThanOrEqualTo',
      field,
      value
    });
  }

  lessThan(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'lessThan',
      field,
      value
    });
  }

  lessThanOrEqualTo(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'lessThanOrEqualTo',
      field,
      value
    });
  }

  like(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'like',
      field,
      value
    });
  }

  between(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'between',
      field,
      value
    });
  }

  in(field, value) {
    return new this.Model.Sql.Expression(this.Model, {
      type: 'in',
      field,
      value
    });
  }

  quoteIdentifier(identifier) {
    return identifier;
  }

  throwSqlError(message) {
    throw new this.Model.Sql.SqlError({
      message: `${this.Model.name}: ${message}`,
      sql: this
    });
  }

  /**
   *
   * @param {object} [options]
   */
  formatSchema() {
    const schema = this.Model.config.schema;

    if (!schema) {
      return;
    }

    return { sql: this.quoteIdentifier(schema) };
  }

  /**
   *
   * @param {object} [options]
   */
  formatTable(options) {
    if (!this.Model.config || !this.Model.config.table) {
      return this.throwSqlError(
        `\`${this.Model.name}.table\` is not configured`
      );
    }

    const schema = this.formatSchema(options);
    const table = this.quoteIdentifier(this.Model.config.table);
    const sql = schema ? `${schema.sql}.${table}` : table;

    return { sql };
  }

  formatAlias(options = {}) {
    if (!options.alias) {
      return;
    }

    return { sql: this.quoteIdentifier(options.alias) };
  }

  /**
   * Formats a field into a column.
   *
   * @param {string} field The field to format. The field should belong to the
   * {@link Model} class passed to the {@link Sql} constructor.
   * @param {object} [options] Query options.
   *
   * @throws {SqlError} If the {@link Model} class passed to the {@link Sql}
   * constructor has no field matching the field passed.
   */
  formatColumn(field) {
    const column = this.Model.config.columns[field];

    if (!column) {
      return this.throwSqlError(`Unknown field \`${field}\``);
    }

    const sql = this.quoteIdentifier(column);

    return { sql };
  }

  formatField(field, options) {
    if (field instanceof this.Model.Sql.Raw) {
      return field.formatRaw(this);
    }

    const table = this.formatAlias(options) || this.formatTable(options);
    const column = this.formatColumn(field);

    return { sql: `${table.sql}.${column.sql}` };
  }

  formatFields(options = {}) {
    const fields = options.fields;

    if (!fields) {
      return;
    }

    const sqls = [];
    const aliases = [];
    let values = [];

    fields.forEach(field => {
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

    return { sql: sqls.join(', '), aliases, values };
  }

  formatReturning(options) {
    const fields = this.formatFields(options);

    if (fields) {
      fields.sql = `RETURNING ${fields.sql}`;
    }

    return fields;
  }

  formatDistinct(options = {}) {
    if (!options.distinct) {
      return;
    }

    return { sql: 'DISTINCT' };
  }

  formatFrom(options) {
    // TODO: support custom and multiple FROM clauses
    const table = this.formatTable(options);
    const alias = this.formatAlias(options);
    const sql = alias ? `${table.sql} AS ${alias.sql}` : table.sql;

    return { sql: `FROM ${sql}` };
  }

  formatWhereOrHaving(value, options) {
    if (!value) {
      return;
    }

    if (!(value instanceof this.Model.Sql.Expression)) {
      value = new this.Model.Sql.Expression(this.Model, {
        type: 'and',
        value
      });
    }

    return value.formatExpression(options);
  }

  formatWhere(options = {}) {
    const where = this.formatWhereOrHaving(options.where, options);

    if (where) {
      where.sql = `WHERE ${where.sql}`;
    }

    return where;
  }

  formatHaving(options = {}) {
    const having = this.formatWhereOrHaving(options.having, options);

    if (having) {
      having.sql = `HAVING ${having.sql}`;
    }

    return having;
  }

  /**
   * Formats multiple formatted SQL parts into a single {@link FormattedSql}.
   * The `sql` strings are concatenated into one space-separated string and the
   * `values` and `aliases` are merged into a single array each.
   *
   * @param {object[]} parts The parts to format.
   * @param {string} parts[].sql The part's SQL.
   * @param {string[]} [parts[].values] The part's values array.
   * @param {string[]} [parts[].aliases] The part's aliases array.
   * @param {object} options Query options.
   *
   * @returns {FormattedSql}
   */
  formatParts(parts) {
    const sqls = [];
    let aliases = [];
    let values = [];

    parts.forEach(part => {
      if (!part) {
        return;
      }

      sqls.push(part.sql);

      if (part.aliases) {
        aliases = aliases.concat(part.aliases);
      }

      if (part.values) {
        values = values.concat(part.values);
      }
    });

    const formatted = { sql: sqls.join(' ') };

    if (aliases.length) {
      formatted.aliases = aliases;
    }

    if (values.length) {
      formatted.values = values;
    }

    return formatted;
  }

  formatSelect(options) {
    return new this.Model.Sql.Select(this.Model).formatSelect(options);
  }

  formatInsert(options) {
    return new this.Model.Sql.Insert(this.Model).formatInsert(options);
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
    /**
     * The {@link Raw} class used by {@link Sql} to create new instances.
     */
    this.Raw = Raw;

    return this;
  }

  /**
   * Updates the {@link Expression} class used by {@link Sql}.
   *
   * @param {Expression} Expression The new class, which should extend the current
   * {@link Sql.Expression} class.
   *
   * @returns {Sql} The {@link Sql} class, to allow chaining.
   */
  static updateExpression(Expression) {
    /**
     * The {@link Expression} class used by {@link Sql} to create new instances.
     */
    this.Expression = Expression;

    return this;
  }

  /**
   * Updates the {@link Select} class used by {@link Sql}.
   *
   * @param {Select} Select The new class, which should extend the current
   * {@link Sql.Select} class.
   *
   * @returns {Sql} The {@link Sql} class, to allow chaining.
   */
  static updateSelect(Select) {
    /**
     * The {@link Select} class used by {@link Sql} to create new instances.
     */
    this.Select = Select;

    return this;
  }

  /**
   * Updates the {@link Insert} class used by {@link Sql}.
   *
   * @param {Insert} Insert The new class, which should extend the current
   * {@link Sql.Insert} class.
   *
   * @returns {Sql} The {@link Sql} class, to allow chaining.
   */
  static updateInsert(Insert) {
    /**
     * The {@link Insert} class used by {@link Sql} to create new instances.
     */
    this.Insert = Insert;

    return this;
  }

  /**
   * Updates the {@link SqlError} class used by {@link Sql}.
   *
   * @param {SqlError} SqlError The new class, which should extend the current
   * {@link Sql.SqlError} class.
   *
   * @returns {Sql} The {@link Sql} class, to allow chaining.
   */
  static updateSqlError(SqlError) {
    /**
     * The {@link SqlError} class used by {@link Sql} to create new instances.
     */
    this.SqlError = SqlError;

    return this;
  }
}

module.exports = Sql;

Sql.Raw = require('./Sql/Raw');
Sql.Expression = require('./Sql/Expression');

Sql.Select = require('./Sql/Select');
Sql.Insert = require('./Sql/Insert');

Sql.SqlError = require('./Sql/SqlError');
