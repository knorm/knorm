const KnormError = require('./KnormError');

class QueryError extends KnormError {
  constructor({ error, query }) {
    super({ error, query });

    this.query = query;

    if (error instanceof Error) {
      this.originalError = error;
    }
  }

  formatMessage({ error, query }) {
    let message = `${query.model.name}: `;

    if (error instanceof Error) {
      message += error.message;
    }

    return message;
  }
}

module.exports = QueryError;
