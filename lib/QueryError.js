const KnormError = require('./KnormError');
const { lowerCase } = require('lodash');

class QueryError extends KnormError {
  constructor({ error, query }) {
    super({ error, query });

    this.query = query;

    if (error instanceof Error) {
      this.originalError = error;
    }
  }

  formatMessage({ error, query }) {
    const message = `${query.model.name}: `;

    if (error instanceof Error) {
      return (
        message + error.message.substring(error.message.lastIndexOf('- ') + 2)
      );
    } else {
      return message + lowerCase(this.constructor.name).replace(' error', '');
    }
  }
}

module.exports = QueryError;
