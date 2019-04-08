class Raw {
  /**
   * Creates a new {@link Sql.Raw} instance.
   *
   * ::: warning NOTE
   * The raw SQL string should not contain values; including values might lead
   * to unexpected results. For example, if there is a string value that
   * contains a question mark, that could be wrongly interpretted as a
   * placeholder by some database plugins (e.g. @knorm/postgres).
   * :::
   *
   * @param {string|object} sql The raw SQL. This could be a string of raw SQL
   * or an object containing `sql` and `values` properties.
   * @param {string} raw.sql The raw SQL string. [Prepared
   * statements](https://en.wikipedia.org/wiki/Prepared_statement) are supported
   * and encouraged. Use question marks (?) as placeholders.
   * @param {array} [raw.values] The values to be bound to the prepared SQL
   * statement.
   *
   * @example Raw SQL with placeholders and values:
   * ```js
   * const raw = new Raw({ sql: 'UPPER(?)', values: ['foo'] });
   * ```
   */
  constructor(sql) {
    if (typeof sql === 'string') {
      sql = { sql };
    }

    this.sql = sql.sql;
    this.values = sql.values;
  }

  /**
   * Formats a {@link Sql.Raw} SQL instance.
   *
   * @param {Sql} sql The {@link Sql} instance being used to format this
   * {@link Raw instance}.
   *
   * @returns {FormattedSql} The formatted SQL
   */
  formatRaw() {
    const formatted = { sql: this.sql };

    if (this.values && this.values.length) {
      formatted.values = this.values;
    }

    return formatted;
  }
}

module.exports = Raw;
