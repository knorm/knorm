const KnormError = require('./KnormError');
const { lowerCase } = require('lodash');

class NoRowsError extends KnormError {
  constructor({ query }) {
    super({ query });

    if (query) {
      this.query = query;
    }
  }

  formatMessage({ query }) {
    return `${query.model.name}: ${lowerCase(this.constructor.name).replace(
      ' error',
      ''
    )}`;
  }
}

module.exports = NoRowsError;
