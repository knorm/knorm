import { KnormError } from './KnormError';
import { lowerCase } from 'lodash';

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

export { NoRowsError };
