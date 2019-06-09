const KnormError = require('./KnormError');

class QueryError extends KnormError {
  constructor(...args) {
    super(...args);

    const { error, query } = this._parseArguments(args);

    if (query) {
      // TODO: use Object.defineProperty to ensure Query instances (which may
      // contain user data) are not enumerable
      this.query = query;
    }

    if (error) {
      this.originalError = error;
    }
  }

  _parseArguments(args) {
    let error;
    let query;

    if (args[0] instanceof Error) {
      error = args[0];
    } else {
      [{ error, query }] = args;
    }

    return { error, query };
  }

  formatMessage(...args) {
    const { error, query } = this._parseArguments(args);

    if (query) {
      return `${query.model.name}: ${error.message}`;
    }

    return error.message;
  }
}

module.exports = QueryError;
