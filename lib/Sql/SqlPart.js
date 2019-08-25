class SqlPart {
  /**
   * Creates a new {@link SqlPart} instance.
   *
   * @param {object} config
   */
  constructor({ type, field, value }) {
    this.type = type;
    this.field = field;
    this.value = value;
  }
}

module.exports = SqlPart;
