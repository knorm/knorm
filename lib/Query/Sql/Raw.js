/**
 * Allows passing raw SQL in queries. Note that this class should not be used
 * directly, but rather via {@link Query#sql}.
 */
class Raw {
  /**
   * Creates a new {@link Raw} instance.
   *
   * ::: warning NOTE
   * Raw SQL string should not contain values. Including values might lead to
   * unexpected results. For example, if there are values that contain a
   * question mark, that will be wrongly interpretted as a placeholder.
   * :::
   *
   * @param {object} raw The raw SQL object. This is an object that contains
   * `sql` and `values` properties.
   * @param {string} raw.sql The raw SQL string, with placeholders (?) instead
   * of values.
   * @param {array} [raw.values=[]] The values to be bound to the SQL string.
   */
  constructor({ sql, values = [] }) {
    this.sql = sql;
    this.values = values;
  }
}

module.exports = Raw;
