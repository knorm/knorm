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
  /**
   * Creates a new {@link Sql} instance.
   *
   * @param {Model} Model The model class to bind the new instance to.
   */
  constructor(Model) {
    const { table, schema, config } = Model;

    this.Model = Model;

    // TODO: remove this and use Model.config directly?
    this.schema = schema;
    this.table = table;
    // TODO: refactor `Model.config.fieldsToColumns` to `Model.columns`
    // TODO: remove `Model.config.fieldNames`
    this.columns = config.fieldsToColumns;
  }

  raw(sql) {
    return new this.constructor.Raw(this.Model, sql);
  }

  and(value) {
    return new this.constructor.Expression(this.Model, { type: 'and', value });
  }

  or(value) {
    return new this.constructor.Expression(this.Model, { type: 'or', value });
  }

  not(value) {
    return new this.constructor.Expression(this.Model, { type: 'not', value });
  }

  any(value) {
    return new this.constructor.Expression(this.Model, { type: 'any', value });
  }

  some(value) {
    return new this.constructor.Expression(this.Model, { type: 'some', value });
  }

  all(value) {
    return new this.constructor.Expression(this.Model, { type: 'all', value });
  }

  exists(value) {
    return new this.constructor.Expression(this.Model, {
      type: 'exists',
      value
    });
  }

  isNull(field) {
    return new this.constructor.Expression(this.Model, {
      type: 'isNull',
      field
    });
  }

  isNotNull(field) {
    return new this.constructor.Expression(this.Model, {
      type: 'isNotNull',
      field
    });
  }

  equalTo(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'equalTo',
      field,
      value
    });
  }

  notEqualTo(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'notEqualTo',
      field,
      value
    });
  }

  greaterThan(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'greaterThan',
      field,
      value
    });
  }

  greaterThanOrEqualTo(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'greaterThanOrEqualTo',
      field,
      value
    });
  }

  lessThan(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'lessThan',
      field,
      value
    });
  }

  lessThanOrEqualTo(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'lessThanOrEqualTo',
      field,
      value
    });
  }

  like(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'like',
      field,
      value
    });
  }

  between(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'between',
      field,
      value
    });
  }

  in(field, value) {
    return new this.constructor.Expression(this.Model, {
      type: 'in',
      field,
      value
    });
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

  formatColumn(field, options) {
    // TODO: throw if column is not found
    const sql = this.quoteIdentifier(this.columns[field]);

    return { sql };
  }

  formatField(field, options) {
    if (field instanceof Raw) {
      return field.formatRaw(this);
    }

    const alias = this.formatAlias(options);
    const { sql: table } = alias || this.formatTable(options);
    const { sql: column } = this.formatColumn(field);

    return { sql: `${table}.${column}` };
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

  formatDistinct(options = {}) {
    if (!options.distinct) {
      return;
    }

    return { sql: 'DISTINCT' };
  }

  // TODO: formatTableAliased?
  formatFromOrInto(options) {
    const table = this.formatTable(options);
    const alias = this.formatAlias(options);
    const sql = alias ? `${table.sql} AS ${alias.sql}` : table.sql;

    return { sql };
  }

  formatFrom(options) {
    // TODO: support custom and multiple FROM clauses
    const from = this.formatFromOrInto(options);

    from.sql = `FROM ${from.sql}`;

    return from;
  }

  formatInto(options) {
    const into = this.formatFromOrInto(options);

    into.sql = `INTO ${into.sql}`;

    return into;
  }

  formatReturning(options = {}) {
    const fields = this.formatFields(options);

    if (!fields) {
      return;
    }

    return { sql: `RETURNING ${fields.sql}`, values: fields.values };
  }

  // TODO: formatExpression?
  formatExpressions(value, options) {
    if (!value) {
      return;
    }

    const expression = new this.constructor.Expression(this.Model, {
      type: 'and',
      value
    });

    return expression.formatExpression(options);
  }

  formatWhere(options = {}) {
    const where = this.formatExpressions(options.where, options);

    if (where) {
      where.sql = `WHERE ${where.sql}`;
    }

    return where;
  }

  formatHaving(options = {}) {
    const having = this.formatExpressions(options.having, options);

    if (having) {
      having.sql = `HAVING ${having.sql}`;
    }

    return having;
  }

  formatParts(parts, options) {
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
    return new this.constructor.Select(this.Model).formatSelect(options);
  }

  formatInsert(options) {
    return new this.constructor.Insert(this.Model).formatInsert(options);
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
    // TODO: test Sql.updateSelect
    // TODO: validate that Select is a child of this.Select

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
    // TODO: test Sql.updateInsert
    // TODO: validate that Insert is a child of this.Insert

    /**
     * The {@link Insert} class used by {@link Sql} to create new instances.
     */
    this.Insert = Insert;

    return this;
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
    // TODO: test Sql.updateRaw
    // TODO: validate that Raw is a child of this.Raw

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
    // TODO: test Sql.updateExpression
    // TODO: validate that Expression is a child of this.Expression

    /**
     * The {@link Expression} class used by {@link Sql} to create new instances.
     */
    this.Expression = Expression;

    return this;
  }
}

module.exports = Sql;

const Raw = require('./Sql/Raw');
const Select = require('./Sql/Select');
const Insert = require('./Sql/Insert');
const Expression = require('./Sql/Expression');

Sql.Raw = Raw;
Sql.Insert = Insert;
Sql.Select = Select;
Sql.Expression = Expression;
