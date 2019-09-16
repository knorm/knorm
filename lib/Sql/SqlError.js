const KnormError = require('../KnormError');

// TODO: refactor KnormError to use GanError
class SqlError extends KnormError {
  constructor({ message, sql }) {
    super(`${sql.Model.name}: ${sql.constructor.name}: ${message}`);

    this.sql = sql;
  }
}

module.exports = SqlError;
