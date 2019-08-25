const KnormError = require('../KnormError');

// TODO: refactor KnormError to use GanError
class SqlError extends KnormError {
  constructor({ message, sql, options }) {
    super(`${options.Model.name}: ${message}`);

    this.sql = sql;
    this.options = options;
  }
}

module.exports = SqlError;
