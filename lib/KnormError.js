class KnormError extends Error {
  constructor(...args) {
    super();

    this.message = this.formatMessage(...args);
    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(this.message).stack;
    }
  }

  formatMessage() {}
}

module.exports = KnormError;
