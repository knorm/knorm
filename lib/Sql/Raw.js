const Sql = require('../Sql');

/**
 * @typedef {object} FormattedSql
 * @property {string} sql The formatted SQL string, containing question marks
 * (?) as placeholders for values.
 * @property {array} [values] The values to be bound to the SQL string i.e.
 * to be used to as replacements for the question marks in the SQL string.
 */

/**
 * Enables passing raw SQL in {@link Query} {@link Options}.
 */
class Raw extends Sql {
  /**
   * Creates a new {@link Raw} instance.
   *
   * ::: warning NOTE
   * The raw SQL string should not contain values - placeholders should be used
   * instead.
   *
   * Including values directly in the SQL string might lead to SQL injection or
   * incorrect SQL generation by some database plugins e.g. @knorm/postgres.
   * :::
   *
   * @param {Model} Model The {@link Model} class that the new instance should
   * bind to.
   * @param {string|object} raw The raw SQL. This could be a string of raw SQL
   * or an object containing `sql` and `values` properties.
   * @param {string} raw.sql The raw SQL string. [Prepared
   * statements](https://en.wikipedia.org/wiki/Prepared_statement) are supported
   * and encouraged. Use question marks (?) as placeholders.
   * @param {array} [raw.values] The values to be bound to the prepared SQL
   * statement.
   *
   * @example Raw SQL with placeholders and values:
   * ```js
   * const raw = new Raw(Model, { sql: 'UPPER(?)', values: ['foo'] });
   * ```
   */
  constructor(Model, raw) {
    super(Model);
    this.sql = raw;
  }

  /**
   * Formats a {@link Raw} instance.
   *
   * @param {object} [options] Query options.
   *
   * @returns {FormattedSql} The formatted SQL.
   */
  formatRaw() {
    const { sql } = this;

    if (typeof sql === 'string') {
      return { sql };
    }

    return { sql: sql.sql, values: sql.values };
  }
}

module.exports = Raw;
