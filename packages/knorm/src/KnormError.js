class KnormError extends Error {
  constructor(...args) {
    const [message] = args;
    const hasMessage = typeof message === 'string';

    super(hasMessage ? message : undefined);

    if (!hasMessage) {
      this.message = this.formatMessage(...args);
    }

    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(this.message).stack;
    }
  }

  formatMessage(message) {
    return message;
  }
}

export { KnormError };
