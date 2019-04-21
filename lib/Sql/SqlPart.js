class SqlPart {
  constructor({ type, field, value }) {
    this.type = type;
    this.value = value;
    this.field = field;
  }
}

module.exports = SqlPart;
