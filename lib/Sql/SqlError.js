const KnormError = require('../KnormError');

class SqlError extends KnormError {
  constructor({ message, sql }) {
    super(message);
    this.sql = sql;
  }
}

module.exports = SqlError;
