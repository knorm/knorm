const KnormError = require('./KnormError');

module.exports = class QueryError extends KnormError {
  constructor(messageOrError, query) {
    super(messageOrError);
    this.query = query;
    this.message = `${this.query.model.name}: ${this.message}`;
  }
};
