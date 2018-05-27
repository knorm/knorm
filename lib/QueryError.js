const KnormError = require('./KnormError');

class QueryError extends KnormError {
  constructor(...args) {
    super(...args);

    const [{ error, query }] = args;

    if (query) {
      this.query = query;
    }

    if (error) {
      this.originalError = error;
    }
  }

  formatMessage({ error, query }) {
    return `${query.model.name}: ${error.message}`;
  }
}

module.exports = QueryError;
