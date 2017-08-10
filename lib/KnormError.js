class KnormError extends Error {
  constructor(messageOrError) {
    super();

    this.message = this.formatMessage(messageOrError);
    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(this.message).stack;
    }

    if (messageOrError instanceof Error) {
      this.originalError = messageOrError;
    }
  }

  formatMessage(messageOrError) {
    let message;

    if (messageOrError instanceof Error) {
      message = messageOrError.message;
    } else if (typeof messageOrError === 'string') {
      message = messageOrError;
    }

    return message;
  }
}

module.exports = KnormError;
