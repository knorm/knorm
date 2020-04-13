import { KnormError } from './KnormError';

class QueryError extends KnormError {
  constructor(...args) {
    super(...args);

    const { error, query } = this._parseArguments(args);

    if (query) {
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

export { QueryError };
